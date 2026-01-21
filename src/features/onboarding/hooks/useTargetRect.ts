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

interface Cancelable {
    cancel: () => void;
}

/**
 * Simple debounce function with cancel
 */
function debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    delay: number
): ((...args: Parameters<T>) => void) & Cancelable {
    let timeoutId: ReturnType<typeof setTimeout>;

    const debounced = (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };

    debounced.cancel = () => {
        clearTimeout(timeoutId);
    };

    return debounced;
}

/**
 * Simple throttle function using RAF with cancel
 */
function throttleRAF<T extends (...args: unknown[]) => void>(
    fn: T,
    waitMs?: number
): ((...args: Parameters<T>) => void) & Cancelable {
    let rafId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastRun = 0;

    const throttled = (...args: Parameters<T>) => {
        // Time-based throttle
        if (typeof waitMs === 'number' && waitMs > 0) {
            const now = Date.now();
            const remaining = waitMs - (now - lastRun);

            if (remaining <= 0) {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                fn(...args);
                lastRun = now;
            } else if (!timeoutId) {
                timeoutId = setTimeout(() => {
                    fn(...args);
                    lastRun = Date.now();
                    timeoutId = null;
                }, remaining);
            }
            return;
        }

        // RAF-based throttle (default)
        if (rafId !== null) return;
        rafId = requestAnimationFrame(() => {
            fn(...args);
            rafId = null;
        });
    };

    throttled.cancel = () => {
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    return throttled;
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
        const throttledScroll = throttleRAF(updateRect, opts.scrollThrottle);

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

            // Cancel pending debounced/throttled calls
            debouncedResize.cancel();
            throttledScroll.cancel();
            debouncedMutation.cancel();

            observerRef.current?.disconnect();
            mutationObserver.disconnect();
        };
    }, [selector, updateRect, opts.resizeDebounce, opts.scrollThrottle]);

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
