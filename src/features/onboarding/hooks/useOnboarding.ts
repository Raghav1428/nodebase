/**
 * useOnboarding Hook
 * 
 * Developer-friendly hook for interacting with the onboarding system.
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
    useOnboardingStore,
    useCurrentStep,
    useProgress,
    useIsActive,
    useNextFeature,
    useHasPausedTour,
} from '../engine';
import { getFeature, areDependenciesMet } from '../registry';
import type { UseOnboardingReturn } from '../types';
import { useTRPC } from '@/trpc/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useOnboarding(): UseOnboardingReturn {
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    // Store state and actions
    const store = useOnboardingStore();
    const currentStep = useCurrentStep();
    const progress = useProgress();
    const isActive = useIsActive();
    const nextFeature = useNextFeature();
    const hasPausedTour = useHasPausedTour();

    // Fetch onboarding status from DB
    const statusQuery = useQuery({
        ...trpc.onboarding.getStatus.queryOptions(),
        refetchOnMount: 'always',
    });

    // Mutation to update status
    const updateMutation = useMutation(
        trpc.onboarding.updateStatus.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: trpc.onboarding.getStatus.queryKey() });
            },
        })
    );

    // Initialize store when status loads from DB
    useEffect(() => {
        if (statusQuery.data && !store.isInitialized) {
            store.initialize(statusQuery.data);
        }
    }, [statusQuery.data, store.isInitialized]);

    // Use ref to hold mutation for stable syncToDb override
    const updateMutationRef = useRef(updateMutation);
    useEffect(() => {
        updateMutationRef.current = updateMutation;
    }, [updateMutation]);

    // Override syncToDb to use TRPC mutation
    useEffect(() => {
        const originalSync = store.syncToDb;
        store.syncToDb = async () => {
            const { status } = useOnboardingStore.getState();
            try {
                await updateMutationRef.current.mutateAsync(status);
            } catch (error) {
                console.error('[Onboarding] Failed to sync to DB:', error);
            }
        };

        return () => {
            store.syncToDb = originalSync;
        };
    }, [store]);
    // Derived: canStartFeature
    const canStartFeature = useCallback((featureId: string): boolean => {
        const feature = getFeature(featureId);
        if (!feature) return false;

        const { status } = store;
        const featureState = status.features[featureId];

        if (featureState?.status === 'completed' || featureState?.status === 'skipped') {
            return false;
        }

        const completedFeatures = Object.entries(status.features)
            .filter(([, state]) => state.status === 'completed')
            .map(([id]) => id);

        return areDependenciesMet(featureId, completedFeatures);
    }, [store.status]);

    return {
        // State
        currentStep,
        progress,
        isActive,
        nextFeature,
        hasPausedTour,
        isInitialized: store.isInitialized,
        isLoading: store.isLoading || statusQuery.isLoading,
        canStartFeature,

        // Actions
        startFeature: store.startFeature,
        completeStep: store.completeStep,
        skipFeature: store.skipFeature,
        pause: store.pause,
        resume: store.resume,
        next: store.nextStep,
        prev: store.prevStep,
    };
}

/**
 * Hook to auto-start onboarding for new users
 */
export function useAutoStartOnboarding() {
    const { isInitialized, nextFeature, startFeature, isActive } = useOnboarding();

    useEffect(() => {
        // Only auto-start if:
        // 1. Store is initialized
        // 2. There's a next feature to start
        // 3. No tour is currently active
        if (isInitialized && nextFeature && !isActive) {
            // Delay to let the page settle
            const timeout = setTimeout(() => {
                startFeature(nextFeature);
            }, 1000);

            return () => clearTimeout(timeout);
        }
    }, [isInitialized, nextFeature, isActive, startFeature]);
}
