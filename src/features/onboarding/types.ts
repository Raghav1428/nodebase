/**
 * Onboarding System Type Definitions
 * 
 * Core types for the feature-based onboarding system.
 */

export type TooltipPlacement =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-start'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-end'
  | 'center'
  | 'target-center';

export interface OnboardingStep {
  /** Unique step identifier */
  id: string;
  /** Feature this step belongs to */
  feature: string;
  /** DOM selector for target element (e.g., '[data-onboarding="nav-workflows"]') */
  target: string;
  /** Tooltip title */
  title: string;
  /** Tooltip description */
  description: string;
  /** Tooltip placement relative to target */
  placement: TooltipPlacement;
  /** Optional callback when advancing to next step */
  onNext?: () => void | Promise<void>;
  /** If true, step requires explicit action (e.g., filling a form) before advancing */
  requireAction?: boolean;
  /** Optional action label (shown instead of "Next" when requireAction is true) */
  actionLabel?: string;
  /** Whether to show the spotlight cutout/border. Defaults to true. */
  showSpotlight?: boolean;
}

export interface OnboardingFeature {
  /** Unique feature identifier */
  id: string;
  /** Human-readable feature name */
  name: string;
  /** Feature IDs that must be completed before this feature can start */
  dependencies: string[];
  /** Steps in this feature tour */
  steps: OnboardingStep[];
  /** Optional route where this feature should auto-start (e.g., '/credentials') */
  route?: string;
  /** Optional dynamic blocker check - returns reason string if blocked, null if unblocked */
  dynamicBlocker?: () => Promise<string | null>;
}

export type FeatureRegistry = Record<string, OnboardingFeature>;

export type FeatureStatusType =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'blocked';

export interface FeatureState {
  status: FeatureStatusType;
  /** Current step ID (when status is 'in_progress') */
  step?: string;
  /** Step index for faster lookup */
  stepIndex?: number;
  /** ISO timestamp when completed */
  completedAt?: string;
  /** ISO timestamp when skipped */
  skippedAt?: string;
  /** Reason for blocked status */
  blockedBy?: string;
}

export interface PausedState {
  feature: string;
  step: string;
  stepIndex: number;
  pausedAt: string;
}

export interface OnboardingStatus {
  /** Schema version for migrations */
  version: 1;
  /** Per-feature state */
  features: Record<string, FeatureState>;
  /** Paused tour state (if any) */
  paused?: PausedState;
}

export interface OnboardingState {
  /** Currently active feature ID (null if no tour active) */
  activeFeature: string | null;
  /** Current step index within active feature */
  currentStepIndex: number;
  /** Whether the tour is paused (UI hidden but state preserved) */
  isPaused: boolean;
  /** Persisted status from DB */
  status: OnboardingStatus;
  /** Loading state for async operations */
  isLoading: boolean;
  /** Whether initial status has been fetched from DB */
  isInitialized: boolean;
  /** Whether a feature is currently starting (async guard) */
  isStarting?: boolean;
}

export interface OnboardingActions {
  /** Initialize store with status from DB */
  initialize: (status: OnboardingStatus) => void;
  /** Start a feature tour */
  startFeature: (featureId: string) => Promise<void>;
  /** Advance to next step */
  nextStep: () => void;
  /** Go back to previous step */
  prevStep: () => void;
  /** Complete current step (for action-gated steps) */
  completeStep: (stepId: string) => void;
  /** Skip the current feature entirely */
  skipFeature: (featureId: string) => void;
  /** Pause the current tour (can resume later) */
  pause: () => void;
  /** Resume a paused tour */
  resume: () => void;
  /** Complete the current feature */
  completeFeature: () => void;
  /** Go to a specific step by ID */
  goToStep: (stepId: string) => void;
  /** Sync state to database */
  syncToDb: () => Promise<void>;
  /** Reset all onboarding state */
  reset: () => void;
}

export type OnboardingStore = OnboardingState & OnboardingActions;

export interface OnboardingProgress {
  current: number;
  total: number;
}

export interface DerivedSelectors {
  /** Get current step data */
  currentStep: OnboardingStep | null;
  /** Get progress for current feature */
  progress: OnboardingProgress;
  /** Whether onboarding UI is visible */
  isActive: boolean;
  /** Check if a feature can be started */
  canStartFeature: (featureId: string) => boolean;
  /** Get next recommended feature to start */
  nextFeature: string | null;
  /** Check if there's a paused tour to resume */
  hasPausedTour: boolean;
}

export interface UseOnboardingReturn extends DerivedSelectors {
  /** Start a feature tour */
  startFeature: (featureId: string) => Promise<void>;
  /** Complete a specific step (for action-gated) */
  completeStep: (stepId: string) => void;
  /** Skip current feature */
  skipFeature: (featureId: string) => void;
  /** Pause current tour */
  pause: () => void;
  /** Resume paused tour */
  resume: () => void;
  /** Advance to next step */
  next: () => void;
  /** Go back to previous step */
  prev: () => void;
  /** Whether store is initialized */
  isInitialized: boolean;
  /** Whether store is loading */
  isLoading: boolean;
}
