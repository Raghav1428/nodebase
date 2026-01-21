/**
 * Onboarding Overlay Component
 * 
 * Renders a spotlight effect with blur background around the target element.
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTargetRect } from './hooks/useTargetRect';
import type { OnboardingStep } from './types';

interface OverlayProps {
  /** Current step being highlighted */
  step: OnboardingStep | null;
  /** Whether the overlay is visible */
  isVisible: boolean;
  /** Callback when clicking outside the spotlight */
  onClickOutside?: () => void;
}

export function Overlay({ step, isVisible, onClickOutside }: OverlayProps) {
  const rect = useTargetRect(step?.target ?? null, { padding: 8 });

  if (!isVisible || !step) {
    return null;
  }

  // Don't show spotlight cutout/border for centered modal steps
  const showSpotlight = rect && step?.showSpotlight !== false;

  // Clamp rect within viewport to ensure borders are visible
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
  
  const safeRect = showSpotlight && rect ? {
    left: Math.max(rect.left, 4),
    top: Math.max(rect.top, 4),
    width: Math.min(rect.width, viewportWidth - Math.max(rect.left, 4) - 4),
    height: Math.min(rect.height, viewportHeight - Math.max(rect.top, 4) - 4),
  } : null;

  const maskId = `spotlight-mask-${step.id}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9998] pointer-events-none"
      >
        {/* Blur overlay with spotlight cutout */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Mask for the spotlight cutout */}
            <mask id={maskId}>
              {/* White = visible, Black = transparent */}
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {showSpotlight && rect && (
                <rect
                  x={rect.left}
                  y={rect.top}
                  width={rect.width}
                  height={rect.height}
                  rx="8"
                  ry="8"
                  fill="black"
                />
              )}
            </mask>
            
            {/* Blur filter */}
            <filter id="blur-filter">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
            </filter>
          </defs>

          {/* Semi-transparent overlay with blur */}
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.5)"
            mask={`url(#${maskId})`}
            style={{ backdropFilter: 'blur(4px)' }}
          />
        </svg>

        {/* Interaction Blocker Layers (4 divs around the target to catch outside clicks) */}
        {rect && (
          <>
            {/* Top */}
            <div 
              className="absolute bg-transparent pointer-events-auto cursor-pointer"
              style={{ top: 0, left: 0, right: 0, height: rect.top }}
              onClick={onClickOutside}
            />
            {/* Bottom */}
            <div 
              className="absolute bg-transparent pointer-events-auto cursor-pointer"
              style={{ top: rect.top + rect.height, left: 0, right: 0, bottom: 0 }}
              onClick={onClickOutside}
            />
            {/* Left */}
            <div 
              className="absolute bg-transparent pointer-events-auto cursor-pointer"
              style={{ top: rect.top, left: 0, width: rect.left, height: rect.height }}
              onClick={onClickOutside}
            />
            {/* Right */}
            <div 
              className="absolute bg-transparent pointer-events-auto cursor-pointer"
              style={{ top: rect.top, left: rect.left + rect.width, right: 0, height: rect.height }}
              onClick={onClickOutside}
            />
          </>
        )}

        {/* Spotlight border glow */}
        {safeRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              boxShadow: [
                '0 0 0 1px var(--primary), 0 0 10px 2px color-mix(in srgb, var(--primary), transparent 85%)',
                '0 0 0 1px var(--primary), 0 0 20px 4px color-mix(in srgb, var(--primary), transparent 80%)',
                '0 0 0 1px var(--primary), 0 0 10px 2px color-mix(in srgb, var(--primary), transparent 85%)',
              ],
            }}
            transition={{ 
              duration: 0.3, 
              delay: 0.1,
              boxShadow: {
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }
            }}
            className="absolute pointer-events-none"
            style={{
              top: safeRect.top - 2,
              left: safeRect.left - 2,
              width: safeRect.width + 4,
              height: safeRect.height + 4,
              borderRadius: '10px',
              border: '1px solid var(--primary)',
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
