import { generateSlug } from "random-word-slugs"
import { CronExpressionParser } from "cron-parser";
import prisma from "@/lib/db";
import { createTRPCRouter, premiumProcedure, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { polarClient } from "@/lib/polar";
import z from "zod";
import { PAGINATION } from "@/config/constants";
import { NodeType } from "@/generated/prisma";
import type { Node, Edge } from "@xyflow/react";
import { sendWorkflowExecution } from "@/inngest/utils";
import { executeNodeForTest } from "@/features/executions/lib/test-executor";

export const workflowsRouter = createTRPCRouter({
    execute: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const workflow = await prisma.workflow.findUniqueOrThrow({
                where: {
                    id: input.id,
                    userId: ctx.auth.user.id,
                },
            });

            await sendWorkflowExecution({
                workflowId: input.id,
            });
            return workflow
        }
        ),

    executeNode: premiumProcedure
        .input(z.object({
            workflowId: z.string(),
            nodeId: z.string(),
            mockContext: z.record(z.string(), z.any()).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Execute node synchronously and return result
            const result = await executeNodeForTest({
                workflowId: input.workflowId,
                nodeId: input.nodeId,
                userId: ctx.auth.user.id,
                mockContext: input.mockContext,
            });

            if (!result.success) {
                let code: "NOT_FOUND" | "FORBIDDEN" | "BAD_REQUEST" | "INTERNAL_SERVER_ERROR" = "INTERNAL_SERVER_ERROR";

                if (result.error === "Node not found") {
                    code = "NOT_FOUND";
                } else if (result.error === "Unauthorized") {
                    code = "FORBIDDEN";
                } else if (result.error === "Trigger nodes cannot be tested individually") {
                    code = "BAD_REQUEST";
                }

                throw new TRPCError({
                    code,
                    message: result.error || "Node execution failed",
                });
            }

            return {
                success: true,
                nodeId: input.nodeId,
                output: result.output,
            };
        }
        ),

    create: protectedProcedure.mutation(async ({ ctx }) => {
        const userId = ctx.auth.user.id;

        return prisma.$transaction(async (tx) => {
            let hasActiveSubscription = false;

            try {
                const customer = await polarClient.customers.getStateExternal({
                    externalId: userId,
                });
                hasActiveSubscription = customer?.activeSubscriptions && customer.activeSubscriptions.length > 0;
            } catch (error) {
                // If customer not found or other error, assume no subscription (free tier)
            }

            if (!hasActiveSubscription) {
                const workflowCount = await tx.workflow.count({
                    where: { userId },
                });

                if (workflowCount >= 3) {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "Free plan limited to 3 workflows. Upgrade to create more.",
                    });
                }
            }

            return tx.workflow.create({
                data: {
                    name: generateSlug(3),
                    userId,
                    nodes: {
                        create: {
                            type: NodeType.INITIAL,
                            position: { x: 0, y: 0 },
                            name: NodeType.INITIAL,
                        },
                    },
                },
            });
        });
    }),

    remove: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ ctx, input }) => {
            return prisma.workflow.delete({
                where: {
                    id: input.id,
                    userId: ctx.auth.user.id,
                }
            });
        }
        ),

    updateName: protectedProcedure
        .input(z.object({ id: z.string(), name: z.string().min(1) }))
        .mutation(({ ctx, input }) => {
            return prisma.workflow.update({
                where: {
                    id: input.id,
                    userId: ctx.auth.user.id,
                },
                data: {
                    name: input.name,
                }
            });
        }
        ),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            nodes: z.array(
                z.object({
                    id: z.string(),
                    type: z.string().nullish(),
                    position: z.object({ x: z.number(), y: z.number() }),
                    data: z.record(z.string(), z.any()).optional(),
                    credentialId: z.string().nullish(),
                })
            ),
            edges: z.array(
                z.object({
                    source: z.string(),
                    target: z.string(),
                    sourceHandle: z.string().nullish(),
                    targetHandle: z.string().nullish(),
                })
            )
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, nodes, edges } = input;
            const now = new Date();

            const workflow = await prisma.workflow.findUniqueOrThrow({
                where: { id, userId: ctx.auth.user.id },
            });

            // Calculate nextRunAt if there is a scheduled trigger
            let nextRunAt = null;
            const scheduledNode = nodes.find(n => n.type === NodeType.SCHEDULED_TRIGGER);

            if (scheduledNode && scheduledNode.data?.cronExpression) {
                try {
                    // @ts-ignore
                    const interval = CronExpressionParser.parse(scheduledNode.data.cronExpression, {
                        currentDate: now,
                    });
                    nextRunAt = interval.next().toDate();
                } catch (error) {
                    console.error("Failed to parse cron expression on save:", error);
                    // If invalid, we just don't schedule it (or could throw error)
                }
            }

            // Extract all credentialIds from nodes and validate ownership
            const nodeCredentialIds = nodes
                .map((node) => node.credentialId || (node.data as Record<string, any>)?.credentialId)
                .filter((id): id is string => !!id);

            // Remove duplicates
            const uniqueCredentialIds = [...new Set(nodeCredentialIds)];

            // Validate that all credentials belong to the current user
            if (uniqueCredentialIds.length > 0) {
                const ownedCredentials = await prisma.credential.findMany({
                    where: {
                        id: { in: uniqueCredentialIds },
                        userId: ctx.auth.user.id,
                    },
                    select: { id: true },
                });

                const ownedCredentialIds = new Set(ownedCredentials.map(c => c.id));
                const unauthorizedCredentialIds = uniqueCredentialIds.filter(id => !ownedCredentialIds.has(id));

                if (unauthorizedCredentialIds.length > 0) {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: `Unauthorized credential access: credentials do not belong to current user`,
                    });
                }
            }

            //Transaction to ensure consistency
            return prisma.$transaction(async (tx) => {
                await tx.node.deleteMany({
                    where: { workflowId: id }
                });

                await tx.node.createMany({
                    data: nodes.map((node) => {
                        // Extract credentialId from data if not at top level
                        const credentialId = node.credentialId || (node.data as Record<string, any>)?.credentialId || null;
                        return {
                            id: node.id,
                            workflowId: id,
                            name: node.type || "unknown",
                            type: node.type as NodeType,
                            position: node.position,
                            data: node.data || {},
                            credentialId,
                        };
                    })
                });

                // Create a set of node IDs for efficient lookup
                const nodeIds = new Set(nodes.map(n => n.id));

                // Filter edges to only include those where both source and target exist
                // This prevents FK constraint violations when edges reference missing nodes
                const validEdges = edges.filter(edge =>
                    nodeIds.has(edge.source) && nodeIds.has(edge.target)
                );

                await tx.connection.createMany({
                    data: validEdges.map((edge) => ({
                        workflowId: id,
                        fromNodeId: edge.source,
                        toNodeId: edge.target,
                        fromOutput: edge.sourceHandle || "main",
                        toInput: edge.targetHandle || "main",
                    }))
                });

                await tx.workflow.update({
                    where: { id },
                    data: {
                        updatedAt: new Date(),
                        nextRunAt,
                    },
                });

                return workflow;
            })
        }
        ),

    getOne: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const workflow = await prisma.workflow.findUniqueOrThrow({
                where: {
                    id: input.id,
                    userId: ctx.auth.user.id,
                },
                include: { nodes: true, connections: true }
            });
            // Transform server nodes to react-flow compatible nodes
            const nodes: Node[] = workflow.nodes.map((node) => ({
                id: node.id,
                type: node.type,
                position: node.position as { x: number; y: number },
                data: {
                    ...(node.data as Record<string, unknown>) || {},
                    credentialId: node.credentialId, // Include credentialId in data for frontend
                },
            }));

            // Transform server edges to react-flow compatible edges
            const edges: Edge[] = workflow.connections.map((connection) => ({
                id: connection.id,
                source: connection.fromNodeId,
                target: connection.toNodeId,
                sourceHandle: connection.fromOutput,
                targetHandle: connection.toInput,
            }));

            return {
                id: workflow.id,
                name: workflow.name,
                nodes,
                edges,
            }
        }
        ),

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
                prisma.workflow.findMany({
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
                prisma.workflow.count({
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
        },
        ),

    generateGoogleSheetsSecret: protectedProcedure
        .input(z.object({ workflowId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { workflowId } = input;

            // Initial read to check if node exists and get current state
            const node = await prisma.node.findFirst({
                where: {
                    workflowId: workflowId,
                    type: NodeType.GOOGLE_SHEETS_TRIGGER,
                    workflow: {
                        userId: ctx.auth.user.id
                    }
                }
            });

            if (!node) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Google Sheets Trigger node not found in this workflow"
                });
            }

            const data = (node.data as Record<string, any>) || {};

            // If secret already exists, return it immediately
            if (data.secret) {
                return { secret: data.secret as string };
            }

            // Generate a new secret
            const newSecret = crypto.randomUUID();

            // Atomic conditional update: only set secret if it's still not set
            // This uses updateMany with a JSON path condition to ensure atomicity
            const updateResult = await prisma.$executeRaw`
                UPDATE "Node"
                SET "data" = jsonb_set(COALESCE("data", '{}'::jsonb), '{secret}', ${JSON.stringify(newSecret)}::jsonb)
                WHERE "id" = ${node.id}
                AND (
                    "data" IS NULL 
                    OR "data"->>'secret' IS NULL 
                    OR "data"->>'secret' = ''
                )
            `;

            // If update succeeded (affected 1 row), return our new secret
            if (Number(updateResult) === 1) {
                return { secret: newSecret };
            }

            // If update didn't affect any rows, another request set the secret first
            // Re-read to get the canonical value
            const updatedNode = await prisma.node.findUnique({
                where: { id: node.id }
            });

            const updatedData = (updatedNode?.data as Record<string, any>) || {};
            return { secret: updatedData.secret as string };
        }),

    generateWebhookSecret: protectedProcedure
        .input(z.object({ workflowId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { workflowId } = input;

            // Initial read to check if node exists and get current state
            const node = await prisma.node.findFirst({
                where: {
                    workflowId: workflowId,
                    type: NodeType.WEBHOOK_TRIGGER,
                    workflow: {
                        userId: ctx.auth.user.id
                    }
                }
            });

            if (!node) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Webhook Trigger node not found in this workflow"
                });
            }

            const data = (node.data as Record<string, any>) || {};

            // If secret already exists, return it immediately
            if (data.secret) {
                return { secret: data.secret as string };
            }

            // Generate a new secret
            const newSecret = crypto.randomUUID();

            // Atomic conditional update: only set secret if it's still not set
            // This uses raw SQL with a JSON path condition to ensure atomicity
            const updateResult = await prisma.$executeRaw`
                UPDATE "Node"
                SET "data" = jsonb_set(COALESCE("data", '{}'::jsonb), '{secret}', ${JSON.stringify(newSecret)}::jsonb)
                WHERE "id" = ${node.id}
                AND (
                    "data" IS NULL 
                    OR "data"->>'secret' IS NULL 
                    OR "data"->>'secret' = ''
                )
            `;

            // If update succeeded (affected 1 row), return our new secret
            if (Number(updateResult) === 1) {
                return { secret: newSecret };
            }

            // If update didn't affect any rows, another request set the secret first
            // Re-read to get the canonical value
            const updatedNode = await prisma.node.findUnique({
                where: { id: node.id }
            });

            const updatedData = (updatedNode?.data as Record<string, any>) || {};
            return { secret: updatedData.secret as string };
        }),

});