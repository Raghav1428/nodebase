/**
 * Onboarding Feature Module
 * 
 * Public API exports for the onboarding system.
 */

// Types
export type {
    OnboardingStep,
    OnboardingFeature,
    OnboardingStatus,
    FeatureState,
    PausedState,
    OnboardingProgress,
    TooltipPlacement,
    UseOnboardingReturn,
} from './types';

// Components
export { OnboardingProvider, OnboardingTrigger } from './OnboardingProvider';
export { Overlay } from './Overlay';
export { Tooltip } from './Tooltip';

// Hooks
export { useOnboarding, useAutoStartOnboarding } from './hooks/useOnboarding';
export { useTargetRect, scrollTargetIntoView } from './hooks/useTargetRect';

// Store (for advanced usage)
export {
    useOnboardingStore,
    useCurrentStep,
    useProgress,
    useIsActive,
    useNextFeature,
    useHasPausedTour,
} from './engine';

// Registry
export {
    FEATURE_REGISTRY,
    getFeature,
    getStep,
    getStepIndex,
    getFeatureOrder,
    areDependenciesMet,
    getNextIncompleteFeature,
} from './registry';
