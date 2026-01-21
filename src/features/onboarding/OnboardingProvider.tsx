/**
 * Onboarding Provider Component
 * 
 * Main provider that orchestrates the onboarding experience.
 * Renders the overlay and tooltip, handles initialization and auto-start.
 */

'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Overlay } from './Overlay';
import { Tooltip } from './Tooltip';
import { useOnboarding } from './hooks/useOnboarding';
import { useOnboardingStore, useCurrentStep, useProgress, useIsActive } from './engine';
import { scrollTargetIntoView } from './hooks/useTargetRect';
import { FEATURE_REGISTRY } from './registry';
import { toast } from 'sonner';

interface OnboardingProviderProps {
  children: React.ReactNode;
  /** Whether to auto-start onboarding for new users */
  autoStart?: boolean;
  /** Delay before showing resume prompt (ms) */
  resumePromptDelay?: number;
}

export function OnboardingProvider({
  children,
  autoStart = true,
  resumePromptDelay = 1500,
}: OnboardingProviderProps) {
  const [isMounted, setIsMounted] = useState(false);
  const { 
    isInitialized, 
    hasPausedTour, 
    nextFeature,
    startFeature,
    resume,
    skipFeature,
  } = useOnboarding();
  
  const store = useOnboardingStore();
  const currentStep = useCurrentStep();
  const progress = useProgress();
  const isActive = useIsActive();

  // Client-side only mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Show resume prompt if there's a paused tour
  const resumeCheckRef = useRef(false);
  useEffect(() => {
    if (!isInitialized) return;
    if (resumeCheckRef.current) return;

    // Mark as checked so we don't show it again for manual pauses in this session
    resumeCheckRef.current = true;

    if (!hasPausedTour) return;

    const timeout = setTimeout(() => {
      const pausedFeature = store.status.paused?.feature;
      if (pausedFeature) {
        toast('Continue your tour?', {
          description: 'You have an unfinished onboarding tour.',
          action: {
            label: 'Resume',
            onClick: () => resume(),
          },
          cancel: {
            label: 'Dismiss',
            onClick: () => {
              // Clear paused state by skipping
              skipFeature(pausedFeature);
            },
          },
          duration: 10000,
        });
      }
    }, resumePromptDelay);

    return () => clearTimeout(timeout);
  }, [isInitialized, hasPausedTour, resume, skipFeature, store.status.paused, resumePromptDelay]);

  // Get current pathname for route-based feature triggering
  const pathname = usePathname();

  // Auto-start onboarding for new users (with route checks)
  useEffect(() => {
    if (!autoStart || !isInitialized || isActive || hasPausedTour) return;
    
    if (nextFeature) {
      // Check if the feature has a route requirement
      const feature = FEATURE_REGISTRY[nextFeature];
      if (feature?.route) {
        // Only start if we're on the correct route
        if (feature.route.endsWith('/*')) {
          // Wildcard match (e.g. '/workflows/*' matches '/workflows/123')
          const routePrefix = feature.route.slice(0, -2);
          if (!pathname.startsWith(routePrefix)) {
            return;
          }
        } else if (pathname !== feature.route) {
          // Exact match
          return;
        }
      }

      const timeout = setTimeout(() => {
        startFeature(nextFeature);
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [autoStart, isInitialized, isActive, hasPausedTour, nextFeature, startFeature, pathname]);

  // Scroll target into view when step changes
  useEffect(() => {
    if (currentStep?.target) {
      // Small delay to let the UI settle
      const timeout = setTimeout(() => {
        scrollTargetIntoView(currentStep.target);
      }, 100);

      return () => clearTimeout(timeout);
    }
  }, [currentStep?.target]);

  // Listen for clicks on target element for action-gated steps
  useEffect(() => {
    if (!currentStep?.requireAction || !currentStep?.target || !isActive) {
      return;
    }

    const handleClick = (e: MouseEvent) => {
      const target = document.querySelector(currentStep.target!);
      if (!target) return;

      // Check if click was inside the target element
      if (target.contains(e.target as Node) || target === e.target) {
        // Complete the current step
        store.completeStep(currentStep.id);
      }
    };

    // Use capture phase to ensure we catch the click before propagation stops
    document.addEventListener('click', handleClick, true);
    
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [currentStep?.requireAction, currentStep?.target, currentStep?.id, isActive, store]);

  // Handle clicking outside (pause)
  const handleClickOutside = useCallback(() => {
    if (isActive && store.activeFeature) {
      store.pause();
      toast('Tour paused', {
        description: 'Click "Resume" to continue.',
        action: {
          label: 'Resume',
          onClick: () => store.resume(),
        },
      });
    }
  }, [isActive, store]);

  // Handle next step
  const handleNext = useCallback(() => {
    store.nextStep();
  }, [store]);

  // Handle previous step
  const handlePrev = useCallback(() => {
    store.prevStep();
  }, [store]);

  // Handle skip
  const handleSkip = useCallback(() => {
    if (store.activeFeature) {
      store.skipFeature(store.activeFeature);
      toast('Tour skipped', {
        description: 'You can restart it from settings anytime.',
      });
    }
  }, [store]);

  // Render overlay and tooltip in a portal
  const renderOnboarding = () => {
    if (!isMounted) return null;

    return createPortal(
      <>
        <Overlay
          step={currentStep}
          isVisible={isActive}
          onClickOutside={handleClickOutside}
        />
        <Tooltip
          step={currentStep}
          progress={progress}
          isVisible={isActive}
          canGoPrev={progress.current > 1}
          onNext={handleNext}
          onPrev={handlePrev}
          onSkip={handleSkip}
        />
      </>,
      document.body
    );
  };

  return (
    <>
      {children}
      {renderOnboarding()}
    </>
  );
}

/**
 * Manual trigger component - allows triggering onboarding from anywhere
 */
export function OnboardingTrigger({ 
  feature, 
  children 
}: { 
  feature: string; 
  children: React.ReactNode;
}) {
  const { startFeature, canStartFeature } = useOnboarding();

  const handleClick = () => {
    if (canStartFeature(feature)) {
      startFeature(feature);
    }
  };

  return (
    <div onClick={handleClick} style={{ cursor: 'pointer' }}>
      {children}
    </div>
  );
}
