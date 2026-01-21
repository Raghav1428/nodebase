/**
 * Onboarding Tooltip Component
 * 
 * Frigade-style tooltip with step counter, actions, and smart positioning.
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTargetRect } from './hooks/useTargetRect';
import type { OnboardingStep, OnboardingProgress, TooltipPlacement } from './types';
import { cn } from '@/lib/utils';

interface TooltipProps {
  /** Current step data */
  step: OnboardingStep | null;
  /** Progress info */
  progress: OnboardingProgress;
  /** Whether the tooltip is visible */
  isVisible: boolean;
  /** Enable previous button */
  canGoPrev?: boolean;
  /** Callback for next/action button */
  onNext: () => void;
  /** Callback for previous button */
  onPrev: () => void;
  /** Callback for skip button */
  onSkip: () => void;
}

const TOOLTIP_GAP = 16;
const TOOLTIP_WIDTH = 320;

/**
 * Calculate tooltip position based on target rect and placement
 */
function calculatePosition(
  rect: { top: number; left: number; width: number; height: number; bottom: number; right: number } | null,
  placement: TooltipPlacement,
  tooltipHeight: number
): { top: number; left: number; actualPlacement: TooltipPlacement } {
  if (!rect) {
    return { top: 0, left: 0, actualPlacement: placement };
  }

  const viewport = {
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  };

  let top = 0;
  let left = 0;
  let actualPlacement = placement;

  // Calculate based on placement
  switch (placement) {
    case 'top':
    case 'top-start':
    case 'top-end':
      top = rect.top - TOOLTIP_GAP - tooltipHeight;
      break;
    case 'bottom':
    case 'bottom-start':
    case 'bottom-end':
      top = rect.bottom + TOOLTIP_GAP;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left - TOOLTIP_WIDTH - TOOLTIP_GAP;
      break;
    case 'right':
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.right + TOOLTIP_GAP;
      break;
    case 'center':
      top = viewport.height / 2 - tooltipHeight / 2;
      left = viewport.width / 2 - TOOLTIP_WIDTH / 2;
      break;
    case 'target-center':
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
      break;
  }

  // Horizontal positioning for top/bottom placements
  if (placement.startsWith('top') || placement.startsWith('bottom')) {
    if (placement.endsWith('-start')) {
      left = rect.left;
    } else if (placement.endsWith('-end')) {
      left = rect.right - TOOLTIP_WIDTH;
    } else {
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
    }
  }

  // Boundary checks - keep tooltip in viewport
  // Horizontal flip for left/right
  if (actualPlacement === 'right' && left + TOOLTIP_WIDTH > viewport.width - 16) {
    // Try flipping to left
    const newLeft = rect.left - TOOLTIP_WIDTH - TOOLTIP_GAP;
    if (newLeft > 16) {
        left = newLeft;
        actualPlacement = 'left';
    }
  } else if (actualPlacement === 'left' && left < 16) {
    // Try flipping to right
    const newLeft = rect.right + TOOLTIP_GAP;
    if (newLeft + TOOLTIP_WIDTH < viewport.width - 16) {
        left = newLeft;
        actualPlacement = 'right';
    }
  }

  // Final clamping (safety net)
  if (left < 16) left = 16;
  if (left + TOOLTIP_WIDTH > viewport.width - 16) {
    // If it still doesn't fit, align with closest edge but ensure visibility
    left = viewport.width - TOOLTIP_WIDTH - 16;
  }

  // Vertical boundary checks
  if (top < 16) {
    // Flip to bottom if not enough space at top
    if (placement.startsWith('top')) {
      top = rect.bottom + TOOLTIP_GAP;
      actualPlacement = placement.replace('top', 'bottom') as TooltipPlacement;
    } else {
      top = 16;
    }
  } else if (top + tooltipHeight > viewport.height - 16) {
     // Flip to top if not enough space at bottom
     if (placement.startsWith('bottom')) {
        const newTop = rect.top - TOOLTIP_GAP - tooltipHeight;
        if(newTop > 16) {
            top = newTop;
            actualPlacement = placement.replace('bottom', 'top') as TooltipPlacement;
        }
     }
  }

  return { top, left, actualPlacement };
}

export function Tooltip({
  step,
  progress,
  isVisible,
  canGoPrev = false,
  onNext,
  onPrev,
  onSkip,
}: TooltipProps) {
  const rect = useTargetRect(step?.target ?? null, { padding: 8 });
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [tooltipHeight, setTooltipHeight] = useState(0);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Measure tooltip height when content changes
  useEffect(() => {
    if (!tooltipRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
        for(let entry of entries) {
            setTooltipHeight(entry.target.getBoundingClientRect().height);
        }
    });
    
    observer.observe(tooltipRef.current);
    
    // Initial measurement
    setTooltipHeight(tooltipRef.current.offsetHeight);
    
    return () => observer.disconnect();
  }, [step]); // Re-measure on step change

  useEffect(() => {
    if (step) {
      let targetRect = rect;
      
      // If no target but placement is center, use viewport as target
      if (!targetRect && step.placement === 'center') {
        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
        const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768;
        
        targetRect = {
          top: 0,
          left: 0,
          width: viewportWidth,
          height: viewportHeight,
          bottom: viewportHeight,
          right: viewportWidth,
        };
      }

      if (targetRect) {
        const pos = calculatePosition(targetRect, step.placement, tooltipHeight);
        setPosition({ top: pos.top, left: pos.left });
      }
    }
  }, [rect, step, tooltipHeight]);

  if (!isVisible || !step) {
    return null;
  }

  const isLastStep = progress.current === progress.total;
  const buttonLabel = step.actionLabel
    ? step.actionLabel
    : isLastStep 
      ? 'Done' 
      : 'Next';

  return (
    <AnimatePresence>
      <motion.div
        ref={tooltipRef}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ 
          duration: 0.2, 
          ease: [0.16, 1, 0.3, 1] // Custom ease for smooth feel
        }}
        className={cn(
          "fixed z-[9999] w-80",
          "bg-popover text-popover-foreground",
          "rounded-xl border border-border/50",
          "shadow-xl shadow-black/10",
          "p-4"
        )}
        style={{
          top: position.top,
          left: position.left,
          maxWidth: TOOLTIP_WIDTH,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with step counter and close */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground">
            {progress.current} / {progress.total}
          </span>
          <button
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 -m-1 rounded-md hover:bg-accent"
            aria-label="Skip tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-1.5">
            {step.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {canGoPrev && progress.current > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrev}
              className="text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          
          <div className="flex-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-muted-foreground"
          >
            Skip
          </Button>

          {!step.requireAction && (
            <Button
              size="sm"
              onClick={onNext}
              disabled={step.requireAction}
              className="gap-1"
            >
              {buttonLabel}
              {!isLastStep && !step.requireAction && (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
