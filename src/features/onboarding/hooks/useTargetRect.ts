/**
 * useTargetRect Hook
 * 
 * Computes and tracks the bounding rect of a target element.
 * Handles recomputation on resize, scroll, and layout shifts.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface TargetRect {
    top: number;
    left: number;
    width: number;
    height: number;
    bottom: number;
    right: number;
}

interface UseTargetRectOptions {
    /** Debounce delay for resize events (ms) */
    resizeDebounce?: number;
    /** Throttle interval for scroll events (ms) */
    scrollThrottle?: number;
    /** Padding around the target element */
    padding?: number;
}

const DEFAULT_OPTIONS: UseTargetRectOptions = {
    resizeDebounce: 150,
    scrollThrottle: 16,
    padding: 8,
};

/**
 * Simple debounce function
 */
function debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Simple throttle function using RAF
 */
function throttleRAF<T extends (...args: unknown[]) => void>(
    fn: T
): (...args: Parameters<T>) => void {
    let rafId: number | null = null;
    return (...args: Parameters<T>) => {
        if (rafId !== null) return;
        rafId = requestAnimationFrame(() => {
            fn(...args);
            rafId = null;
        });
    };
}

export function useTargetRect(
    selector: string | null,
    options: UseTargetRectOptions = {}
): TargetRect | null {
    const [rect, setRect] = useState<TargetRect | null>(null);
    const targetRef = useRef<Element | null>(null);
    const observerRef = useRef<ResizeObserver | null>(null);
    const lastRectRef = useRef<TargetRect | null>(null);

    const opts = { ...DEFAULT_OPTIONS, ...options };

    const updateRect = useCallback(() => {
        if (!selector) {
            if (lastRectRef.current !== null) {
                lastRectRef.current = null;
                setRect(null);
            }
            return;
        }

        const target = document.querySelector(selector);
        if (!target) {
            if (lastRectRef.current !== null) {
                lastRectRef.current = null;
                setRect(null);
            }
            return;
        }

        targetRef.current = target;
        const domRect = target.getBoundingClientRect();
        const padding = opts.padding ?? 0;

        const newRect: TargetRect = {
            top: domRect.top - padding,
            left: domRect.left - padding,
            width: domRect.width + padding * 2,
            height: domRect.height + padding * 2,
            bottom: domRect.bottom + padding,
            right: domRect.right + padding,
        };

        // Only update if rect actually changed (prevents infinite loops)
        const lastRect = lastRectRef.current;
        if (
            !lastRect ||
            lastRect.top !== newRect.top ||
            lastRect.left !== newRect.left ||
            lastRect.width !== newRect.width ||
            lastRect.height !== newRect.height
        ) {
            lastRectRef.current = newRect;
            setRect(newRect);
        }
    }, [selector, opts.padding]);

    useEffect(() => {
        if (!selector) {
            setRect(null);
            lastRectRef.current = null;
            return;
        }

        // Initial computation with delay for DOM to settle
        const initialTimeout = setTimeout(updateRect, 50);

        // Poll for animations (e.g. sheet sliding in)
        const pollInterval = setInterval(updateRect, 50);
        const pollTimeout = setTimeout(() => clearInterval(pollInterval), 5000);

        // Set up ResizeObserver
        const target = document.querySelector(selector);
        if (target) {
            observerRef.current = new ResizeObserver(updateRect);
            observerRef.current.observe(target);
        }

        // Set up event listeners
        const debouncedResize = debounce(updateRect, opts.resizeDebounce ?? 150);
        const throttledScroll = throttleRAF(updateRect);

        window.addEventListener('resize', debouncedResize);
        window.addEventListener('scroll', throttledScroll, { passive: true });

        // Debounced mutation handler to prevent infinite loops
        const debouncedMutation = debounce(() => {
            // Re-query the element in case it was remounted
            const newTarget = document.querySelector(selector);
            if (newTarget !== targetRef.current) {
                targetRef.current = newTarget;
                if (observerRef.current) {
                    observerRef.current.disconnect();
                    if (newTarget) {
                        observerRef.current.observe(newTarget);
                    }
                }
                updateRect();
            }
        }, 100);

        // Only observe childList changes, not attribute changes (which cause infinite loops)
        const mutationObserver = new MutationObserver(debouncedMutation);
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(pollInterval);
            clearTimeout(pollTimeout);
            window.removeEventListener('resize', debouncedResize);
            window.removeEventListener('scroll', throttledScroll);
            observerRef.current?.disconnect();
            mutationObserver.disconnect();
        };
    }, [selector, updateRect, opts.resizeDebounce]);

    return rect;
}

/**
 * Check if an element is within the viewport
 */
export function isRectInViewport(rect: TargetRect): boolean {
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth
    );
}

/**
 * Scroll element into view if not visible
 */
export function scrollTargetIntoView(selector: string): void {
    const target = document.querySelector(selector);
    if (target) {
        target.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center',
        });
    }
}
