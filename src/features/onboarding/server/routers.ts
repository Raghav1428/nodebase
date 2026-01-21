/**
 * Onboarding TRPC Router
 * 
 * Server-side API for onboarding status persistence.
 */

import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/trpc/init';
import prisma from '@/lib/db';
import type { Prisma } from '@/generated/prisma';
import type { OnboardingStatus } from '../types';

// ============================================================================
// Zod Schemas
// ============================================================================

const featureStateSchema = z.object({
    status: z.enum(['not_started', 'in_progress', 'completed', 'skipped', 'blocked']),
    step: z.string().optional(),
    stepIndex: z.number().optional(),
    completedAt: z.string().optional(),
    skippedAt: z.string().optional(),
    blockedBy: z.string().optional(),
});

const pausedStateSchema = z.object({
    feature: z.string(),
    step: z.string(),
    stepIndex: z.number(),
    pausedAt: z.string(),
});

const onboardingStatusSchema = z.object({
    version: z.literal(1),
    features: z.record(z.string(), featureStateSchema),
    paused: pausedStateSchema.optional(),
});

// ============================================================================
// Router
// ============================================================================

export const onboardingRouter = createTRPCRouter({
    /**
     * Get the current user's onboarding status
     */
    getStatus: protectedProcedure.query(async ({ ctx }) => {
        const user = await prisma.user.findUnique({
            where: { id: ctx.auth.user.id },
            select: { onboardingStatus: true },
        });

        // Return default if no status exists
        if (!user?.onboardingStatus || typeof user.onboardingStatus !== 'object') {
            const defaultStatus: OnboardingStatus = {
                version: 1,
                features: {},
                paused: undefined,
            };
            return defaultStatus;
        }

        // Validate and return
        const parsed = onboardingStatusSchema.safeParse(user.onboardingStatus);
        if (parsed.success) {
            return parsed.data as OnboardingStatus;
        }

        // Return default if invalid
        return {
            version: 1,
            features: {},
            paused: undefined,
        } as OnboardingStatus;
    }),

    /**
     * Update the user's onboarding status
     */
    updateStatus: protectedProcedure
        .input(onboardingStatusSchema)
        .mutation(async ({ ctx, input }) => {
            await prisma.user.update({
                where: { id: ctx.auth.user.id },
                data: { onboardingStatus: input as Prisma.InputJsonValue },
            });

            return { success: true };
        }),

    /**
     * Reset onboarding status (for testing/debugging)
     */
    reset: protectedProcedure.mutation(async ({ ctx }) => {
        const defaultStatus: OnboardingStatus = {
            version: 1,
            features: {},
            paused: undefined,
        };

        await prisma.user.update({
            where: { id: ctx.auth.user.id },
            data: { onboardingStatus: defaultStatus as unknown as Prisma.InputJsonValue },
        });

        return { success: true };
    }),
});
