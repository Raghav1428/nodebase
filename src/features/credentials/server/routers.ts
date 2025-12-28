import prisma from "@/lib/db";
import { createTRPCRouter, premiumProcedure, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { polarClient } from "@/lib/polar";
import z from "zod";
import { PAGINATION } from "@/config/constants";
import { CredentialType } from "@/generated/prisma";
import { encrypt } from "@/lib/encryption";

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
        .mutation(({ ctx, input }) => {
            return prisma.credential.delete({
                where: {
                    id: input.id,
                    userId: ctx.auth.user.id,
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
            });
        }),

});