import prisma from "@/lib/db";
import { createTRPCRouter, premiumProcedure, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { polarClient } from "@/lib/polar";
import z from "zod";
import { PAGINATION } from "@/config/constants";
import { CredentialType } from "@/generated/prisma";
import { encrypt } from "@/lib/encryption";
import { revokeGoogleCredential } from "@/lib/google-sheets";

export const credentialsRouter = createTRPCRouter({

    create: protectedProcedure
        .input(
            z.object({
                name: z.string().min(1, "Name is Required"),
                type: z.enum(CredentialType),
                value: z.string().min(1, "API Key is Required"),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { name, type, value } = input;
            const userId = ctx.auth.user.id;
            let hasActiveSubscription = false;
            try {
                const customer = await polarClient.customers.getStateExternal({
                    externalId: userId,
                });
                hasActiveSubscription = customer?.activeSubscriptions && customer.activeSubscriptions.length > 0;
            } catch (error) {
                // Assume free tier on error/not found
            }

            return prisma.$transaction(async (tx) => {
                if (!hasActiveSubscription) {
                    const credentialCount = await tx.credential.count({
                        where: { userId },
                    });

                    if (credentialCount >= 3) {
                        throw new TRPCError({
                            code: "FORBIDDEN",
                            message: "Free plan limited to 3 credentials. Upgrade to create more.",
                        });
                    }
                }

                return tx.credential.create({
                    data: {
                        name,
                        userId,
                        type,
                        value: encrypt(value),
                    },
                });
            });
        }),

    remove: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.auth.user.id;

            // Check if it's a Google Sheets credential and revoke token
            const credential = await prisma.credential.findUnique({
                where: { id: input.id, userId },
            });

            if (credential?.type === CredentialType.GOOGLE_SHEETS && credential.value) {
                await revokeGoogleCredential(credential.value);
            }

            return prisma.credential.delete({
                where: {
                    id: input.id,
                    userId,
                }
            });
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().min(1, "Name is Required"),
            type: z.enum(CredentialType),
            value: z.string().min(1, "API Key is Required"),
        }))
        .mutation(async ({ ctx, input }) => {

            const { id, name, type, value } = input;

            const credential = await prisma.credential.findUniqueOrThrow({
                where: { id, userId: ctx.auth.user.id },
            });

            return prisma.credential.update({
                where: { id, userId: ctx.auth.user.id },
                data: {
                    name,
                    type,
                    value: encrypt(value),
                },
            });
        }),

    getOne: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(({ ctx, input }) => {
            return prisma.credential.findUniqueOrThrow({
                where: {
                    id: input.id,
                    userId: ctx.auth.user.id,
                },
                select: {
                    id: true,
                    name: true,
                    type: true,
                    createdAt: true,
                    updatedAt: true,
                    userId: true,
                },
            });
        }),

    getMany: protectedProcedure
        .input(
            z.object({
                page: z.number().default(PAGINATION.DEFAULT_PAGE),
                pageSize: z.number().min(PAGINATION.MIN_PAGE_SIZE).max(PAGINATION.MAX_PAGE_SIZE).default(PAGINATION.DEFAULT_PAGE_SIZE),
                search: z.string().default(""),
            })
        )
        .query(async ({ ctx, input }) => {
            const { page, pageSize, search } = input;

            const [items, totalCount] = await Promise.all([
                prisma.credential.findMany({
                    skip: (page - 1) * pageSize,
                    take: pageSize,
                    where: {
                        userId: ctx.auth.user.id,
                        name: {
                            contains: search,
                            mode: "insensitive"
                        }
                    },
                    orderBy: {
                        updatedAt: "desc"
                    },
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        createdAt: true,
                        updatedAt: true,
                        userId: true,
                    },
                }),
                prisma.credential.count({
                    where: {
                        userId: ctx.auth.user.id,
                        name: {
                            contains: search,
                            mode: "insensitive"
                        },
                    },
                }),
            ])

            const totalPages = Math.ceil(totalCount / pageSize);
            const hasNextPage = page < totalPages;
            const hasPreviousPage = page > 1

            return {
                items: items,
                page,
                pageSize,
                totalCount,
                totalPages,
                hasNextPage,
                hasPreviousPage
            };
        }),

    getByType: protectedProcedure
        .input(z.object({ type: z.enum(CredentialType) }))
        .query(({ ctx, input }) => {
            const { type } = input;
            return prisma.credential.findMany({
                where: {
                    userId: ctx.auth.user.id,
                    type,
                },
                orderBy: {
                    updatedAt: "desc"
                },
                select: {
                    id: true,
                    name: true,
                    type: true,
                    createdAt: true,
                    updatedAt: true,
                    userId: true,
                },
            });
        }),

});