import { inngest } from "./client";
import prisma from "@/lib/db";
import { sendWorkflowExecution } from "./utils";
import { NodeType } from "@/generated/prisma";
import { CronExpressionParser } from "cron-parser";
import { NonRetriableError } from "inngest";

/**
 * Scheduled workflow runner that checks every minute for workflows
 * that should be triggered based on their cron expressions.
 */
export const scheduledWorkflowRunner = inngest.createFunction(
    { id: "scheduled-workflow-runner" },
    { cron: "* * * * *" }, // Runs every minute
    async ({ step }) => {
        // Find all workflows with SCHEDULED_TRIGGER nodes
        const scheduledWorkflows = await step.run("find-scheduled-workflows", async () => {
            return prisma.workflow.findMany({
                where: {
                    nodes: {
                        some: {
                            type: NodeType.SCHEDULED_TRIGGER,
                        },
                    },
                },
                include: {
                    nodes: {
                        where: {
                            type: NodeType.SCHEDULED_TRIGGER,
                        },
                    },
                },
            });
        });

        const now = new Date();
        const currentMinute = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            now.getHours(),
            now.getMinutes()
        );

        const triggeredWorkflows: string[] = [];

        for (const workflow of scheduledWorkflows) {
            for (const node of workflow.nodes) {
                const data = node.data as { cronExpression?: string };
                if (!data.cronExpression) continue;

                try {
                    const interval = CronExpressionParser.parse(data.cronExpression, {
                        currentDate: now,
                    });

                    // Get the previous scheduled time
                    const prev = interval.prev().toDate();

                    // Check if the previous scheduled time is within the current minute window
                    const minuteStart = currentMinute.getTime();
                    const minuteEnd = minuteStart + 60000;

                    if (prev.getTime() >= minuteStart && prev.getTime() < minuteEnd) {
                        await step.run(`trigger-workflow-${workflow.id}-${node.id}`, async () => {
                            await sendWorkflowExecution({
                                workflowId: workflow.id,
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
                    }
                } catch (err) {
                    continue;
                }
            }
        }

        return {
            checked: scheduledWorkflows.length,
            triggered: triggeredWorkflows.length,
            triggeredWorkflows,
        };
    }
);
