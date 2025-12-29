import { inngest } from "./client";
import prisma from "@/lib/db";
import { sendWorkflowExecution } from "./utils";
import { NodeType } from "@/generated/prisma";
import { CronExpressionParser } from "cron-parser";

/**
 * Scheduled workflow runner that checks every minute for workflows
 * that should be triggered based on their cron expressions.
 */
export const scheduledWorkflowRunner = inngest.createFunction(
    { id: "scheduled-workflow-runner", concurrency: 1 },
    { cron: "* * * * *" }, // Runs every minute
    async ({ step }) => {
        const now = new Date();

        // 1. Find workflows due to run
        const dueWorkflows = await step.run("find-due-workflows", async () => {
            return prisma.workflow.findMany({
                where: {
                    nextRunAt: {
                        lte: now
                    },
                    nodes: { some: { type: NodeType.SCHEDULED_TRIGGER } }
                },
                include: {
                    nodes: { where: { type: NodeType.SCHEDULED_TRIGGER } }
                }
            });
        });

        if (dueWorkflows.length === 0) {
            return { checked: 0, triggered: 0, triggeredWorkflows: [] };
        }

        const triggeredWorkflows: string[] = [];

        for (const workflow of dueWorkflows) {
            for (const node of workflow.nodes) {
                const data = node.data as { cronExpression?: string };
                if (!data.cronExpression) {
                    console.warn(`Workflow ${workflow.id} has scheduled node ${node.id} without cronExpression`);
                    continue;
                }

                try {
                    const interval = CronExpressionParser.parse(data.cronExpression, {
                        currentDate: now,
                    });
                    const nextRun = interval.next().toDate();

                    // 2. ATOMIC LOCK & UPDATE
                    console.log(`[scheduler] attempting lock for ${workflow.id}. CurNextRunAt: ${String(workflow.nextRunAt)} Now: ${now.toISOString()}`);

                    const updateResult = await step.run(`lock-workflow-${workflow.id}`, async () => {
                        return prisma.workflow.updateMany({
                            where: {
                                id: workflow.id,
                                nextRunAt: { lte: now } // Robust lock: update if it is still considered "due"
                            },
                            data: { nextRunAt: nextRun }
                        });
                    });

                    if (updateResult.count === 0) {
                        continue;
                    }

                    // 3. Trigger idempotently
                    await step.run(`trigger-workflow-${workflow.id}`, async () => {
                        const executionId = `scheduled:${workflow.id}:${node.id}:${now.toISOString()}`;

                        await sendWorkflowExecution({
                            workflowId: workflow.id,
                            id: executionId, // Idempotency key
                            initialData: {
                                scheduled: {
                                    timestamp: now.toISOString(),
                                    cronExpression: data.cronExpression,
                                    nodeId: node.id,
                                },
                            },
                        });
                    });

                    triggeredWorkflows.push(workflow.id);
                    break;

                } catch (err) {
                    continue;
                }
            }
        }

        return {
            checked: dueWorkflows.length,
            triggered: triggeredWorkflows.length,
            triggeredWorkflows,
        };
    }
);
