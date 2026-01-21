/**
 * Onboarding Engine (Zustand Store)
 * 
 * State machine for managing onboarding flow with DB persistence.
 */

import { create } from 'zustand';
import type {
    OnboardingStore,
    OnboardingState,
    OnboardingStatus,
    OnboardingStep,
    OnboardingProgress,
    FeatureState,
} from './types';
import { FEATURE_REGISTRY, getFeature, areDependenciesMet, getNextIncompleteFeature } from './registry';

// ============================================================================
// Default State
// ============================================================================

const DEFAULT_STATUS: OnboardingStatus = {
    version: 1,
    features: {},
    paused: undefined,
};

const DEFAULT_STATE: OnboardingState = {
    activeFeature: null,
    currentStepIndex: 0,
    isPaused: false,
    status: DEFAULT_STATUS,
    isLoading: false,
    isInitialized: false,
};

// ============================================================================
// Store Creation
// ============================================================================

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
    ...DEFAULT_STATE,

    // --------------------------------------------------------------------------
    // Initialize
    // --------------------------------------------------------------------------
    initialize: (status: OnboardingStatus) => {
        set({
            status,
            isInitialized: true,
            isLoading: false,
        });

        // Check for paused state and auto-resume
        if (status.paused) {
            set({
                activeFeature: status.paused.feature,
                currentStepIndex: status.paused.stepIndex,
                isPaused: true,
            });
        }
    },

    // --------------------------------------------------------------------------
    // Start Feature
    // --------------------------------------------------------------------------
    startFeature: async (featureId: string) => {
        const { status, activeFeature, isStarting } = get();

        // 1. Guard: Check if already processing a start or if a feature is already active
        if (isStarting || activeFeature) {
            console.log(`[Onboarding] Start ignored: ${isStarting ? 'already starting' : 'feature active'}`);
            return;
        }

        const feature = getFeature(featureId);

        if (!feature) {
            console.warn(`[Onboarding] Feature "${featureId}" not found`);
            return;
        }

        // Lock execution
        set({ isStarting: true });

        try {
            // Check if already completed or skipped
            const featureState = status.features[featureId];
            if (featureState?.status === 'completed' || featureState?.status === 'skipped') {
                console.warn(`[Onboarding] Feature "${featureId}" already ${featureState.status}`);
                set({ isStarting: false });
                return;
            }

            // Check dependencies
            const completedFeatures = Object.entries(status.features)
                .filter(([, state]) => state.status === 'completed')
                .map(([id]) => id);

            if (!areDependenciesMet(featureId, completedFeatures)) {
                console.warn(`[Onboarding] Dependencies not met for "${featureId}"`);
                set({ isStarting: false });
                return;
            }

            // Check dynamic blocker
            if (feature.dynamicBlocker) {
                const blockedBy = await feature.dynamicBlocker();
                if (blockedBy) {
                    set((state) => ({
                        isStarting: false,
                        status: {
                            ...state.status,
                            features: {
                                ...state.status.features,
                                [featureId]: { status: 'blocked', blockedBy },
                            },
                        },
                    }));
                    return;
                }
            }

            // Start the feature
            const startStepIndex = featureState?.stepIndex ?? 0;

            set((state) => ({
                activeFeature: featureId,
                currentStepIndex: startStepIndex,
                isPaused: false,
                isStarting: false, // Release lock
                status: {
                    ...state.status,
                    features: {
                        ...state.status.features,
                        [featureId]: {
                            status: 'in_progress',
                            step: feature.steps[startStepIndex]?.id,
                            stepIndex: startStepIndex,
                        },
                    },
                    paused: undefined, // Clear paused state
                },
            }));

            // Sync to DB
            get().syncToDb();

        } catch (error) {
            console.error('[Onboarding] startFeature failed:', error);
            set({ isStarting: false });
        }
    },

    // --------------------------------------------------------------------------
    // Next Step
    // --------------------------------------------------------------------------
    nextStep: () => {
        const { activeFeature, currentStepIndex, status } = get();

        if (!activeFeature) return;

        const feature = getFeature(activeFeature);
        if (!feature) return;

        const currentStep = feature.steps[currentStepIndex];

        // Execute onNext callback if present
        if (currentStep?.onNext) {
            try {
                currentStep.onNext();
            } catch (error) {
                console.error(`[Onboarding] onNext callback failed for step "${currentStep.id}":`, error);
            }
        }
        const nextIndex = currentStepIndex + 1;

        // Check if we've completed all steps
        if (nextIndex >= feature.steps.length) {
            get().completeFeature();
            return;
        }

        // Advance to next step
        set((state) => ({
            currentStepIndex: nextIndex,
            status: {
                ...state.status,
                features: {
                    ...state.status.features,
                    [activeFeature]: {
                        status: 'in_progress',
                        step: feature.steps[nextIndex].id,
                        stepIndex: nextIndex,
                    },
                },
            },
        }));

        get().syncToDb();
    },

    // --------------------------------------------------------------------------
    // Previous Step
    // --------------------------------------------------------------------------
    prevStep: () => {
        const { activeFeature, currentStepIndex } = get();

        if (!activeFeature || currentStepIndex <= 0) return;

        const feature = getFeature(activeFeature);
        if (!feature) return;

        const prevIndex = currentStepIndex - 1;

        set((state) => ({
            currentStepIndex: prevIndex,
            status: {
                ...state.status,
                features: {
                    ...state.status.features,
                    [activeFeature]: {
                        status: 'in_progress',
                        step: feature.steps[prevIndex].id,
                        stepIndex: prevIndex,
                    },
                },
            },
        }));

        get().syncToDb();
    },

    // --------------------------------------------------------------------------
    // Go To Step (Jump)
    // --------------------------------------------------------------------------
    goToStep: (stepId: string) => {
        const { activeFeature, status } = get();
        if (!activeFeature) return;

        const feature = getFeature(activeFeature);
        if (!feature) return;

        const stepIndex = feature.steps.findIndex(s => s.id === stepId);
        if (stepIndex === -1) return;

        set((state) => ({
            currentStepIndex: stepIndex,
            isPaused: false,
            status: {
                ...state.status,
                features: {
                    ...state.status.features,
                    [activeFeature]: {
                        status: 'in_progress',
                        step: stepId,
                        stepIndex: stepIndex,
                    },
                },
            },
        }));

        get().syncToDb();
    },

    // --------------------------------------------------------------------------
    // Complete Step (for action-gated steps)
    // --------------------------------------------------------------------------
    completeStep: (stepId: string) => {
        const { activeFeature, currentStepIndex } = get();

        if (!activeFeature) return;

        const feature = getFeature(activeFeature);
        if (!feature) return;

        const currentStep = feature.steps[currentStepIndex];

        // Verify this is the current step and it requires action
        if (currentStep?.id === stepId && currentStep.requireAction) {
            get().nextStep();
        }
    },

    // --------------------------------------------------------------------------
    // Skip Feature
    // --------------------------------------------------------------------------
    skipFeature: (featureId: string) => {
        set((state) => ({
            activeFeature: state.activeFeature === featureId ? null : state.activeFeature,
            currentStepIndex: state.activeFeature === featureId ? 0 : state.currentStepIndex,
            isPaused: false,
            status: {
                ...state.status,
                features: {
                    ...state.status.features,
                    [featureId]: {
                        status: 'skipped',
                        skippedAt: new Date().toISOString(),
                    },
                },
                paused: undefined,
            },
        }));

        get().syncToDb();
    },

    // --------------------------------------------------------------------------
    // Pause
    // --------------------------------------------------------------------------
    pause: () => {
        const { activeFeature, currentStepIndex } = get();

        if (!activeFeature) return;

        const feature = getFeature(activeFeature);
        if (!feature) return;

        set((state) => ({
            isPaused: true,
            status: {
                ...state.status,
                paused: {
                    feature: activeFeature,
                    step: feature.steps[currentStepIndex]?.id ?? '',
                    stepIndex: currentStepIndex,
                    pausedAt: new Date().toISOString(),
                },
            },
        }));

        get().syncToDb();
    },

    // --------------------------------------------------------------------------
    // Resume
    // --------------------------------------------------------------------------
    resume: () => {
        const { status } = get();

        if (!status.paused) return;

        set((state) => ({
            activeFeature: state.status.paused?.feature ?? null,
            currentStepIndex: state.status.paused?.stepIndex ?? 0,
            isPaused: false,
            status: {
                ...state.status,
                paused: undefined,
            },
        }));

        get().syncToDb();
    },

    // --------------------------------------------------------------------------
    // Complete Feature
    // --------------------------------------------------------------------------
    completeFeature: () => {
        const { activeFeature } = get();

        if (!activeFeature) return;

        set((state) => ({
            activeFeature: null,
            currentStepIndex: 0,
            isPaused: false,
            status: {
                ...state.status,
                features: {
                    ...state.status.features,
                    [activeFeature]: {
                        status: 'completed',
                        completedAt: new Date().toISOString(),
                    },
                },
                paused: undefined,
            },
        }));

        get().syncToDb();
    },

    // --------------------------------------------------------------------------
    // Sync to DB (will be connected to TRPC)
    // --------------------------------------------------------------------------
    syncToDb: async () => {
        // This will be replaced with actual TRPC mutation
        // For now, we'll just log
        const { status } = get();
        console.log('[Onboarding] Syncing to DB:', status);

        // Placeholder for TRPC mutation
        // await trpc.onboarding.updateStatus.mutate({ status });
    },

    // --------------------------------------------------------------------------
    // Reset
    // --------------------------------------------------------------------------
    reset: () => {
        set(DEFAULT_STATE);
    },
}));

// ============================================================================
// Derived Selectors
// ============================================================================

/**
 * Get current step data
 */
export function useCurrentStep(): OnboardingStep | null {
    const { activeFeature, currentStepIndex } = useOnboardingStore();

    if (!activeFeature) return null;

    const feature = getFeature(activeFeature);
    return feature?.steps[currentStepIndex] ?? null;
}

/**
 * Get progress for current feature
 */
export function useProgress(): OnboardingProgress {
    const { activeFeature, currentStepIndex } = useOnboardingStore();

    if (!activeFeature) {
        return { current: 0, total: 0 };
    }

    const feature = getFeature(activeFeature);
    return {
        current: currentStepIndex + 1,
        total: feature?.steps.length ?? 0,
    };
}

/**
 * Check if onboarding UI is visible
 */
export function useIsActive(): boolean {
    const { activeFeature, isPaused } = useOnboardingStore();
    return activeFeature !== null && !isPaused;
}

/**
 * Check if a feature can be started
 */
export function useCanStartFeature(featureId: string): boolean {
    const { status } = useOnboardingStore();

    const feature = getFeature(featureId);
    if (!feature) return false;

    // Already completed or skipped
    const featureState = status.features[featureId];
    if (featureState?.status === 'completed' || featureState?.status === 'skipped') {
        return false;
    }

    // Check dependencies
    const completedFeatures = Object.entries(status.features)
        .filter(([, state]) => state.status === 'completed')
        .map(([id]) => id);

    return areDependenciesMet(featureId, completedFeatures);
}

/**
 * Get next recommended feature to start
 */
export function useNextFeature(): string | null {
    const { status } = useOnboardingStore();

    const completedFeatures = Object.entries(status.features)
        .filter(([, state]) => state.status === 'completed')
        .map(([id]) => id);

    const skippedFeatures = Object.entries(status.features)
        .filter(([, state]) => state.status === 'skipped')
        .map(([id]) => id);

    return getNextIncompleteFeature(completedFeatures, skippedFeatures);
}

/**
 * Check if there's a paused tour
 */
export function useHasPausedTour(): boolean {
    const { status } = useOnboardingStore();
    return status.paused !== undefined;
}
