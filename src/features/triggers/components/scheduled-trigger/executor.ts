import type { NodeExecutor } from "@/features/executions/types";
import { scheduledTriggerChannel } from "@/inngest/channels/scheduled-trigger";
import { NonRetriableError } from "inngest";

type ScheduledTriggerData = {
  cronExpression?: string;
};

export const scheduledTriggerExecutor: NodeExecutor<ScheduledTriggerData> = async ({ data, nodeId, context, step, publish }) => {
    
    await publish(
        scheduledTriggerChannel().status({
            nodeId,
            status: "loading",
        })
    );

    try {

        if (data?.cronExpression && typeof data.cronExpression !== "string") {
        throw new NonRetriableError("cronExpression must be a string");
        }

        if (data?.cronExpression) {
        const parts = data.cronExpression.trim().split(/\s+/);
        if (parts.length !== 5) {
            throw new NonRetriableError("Invalid cron expression");
        }
        }

        const result = await step.run("scheduled-trigger", async () => {
        return context;
        });

        await publish(
        scheduledTriggerChannel().status({
            nodeId,
            status: "success",
        })
        );

    return result;
  } catch (error: any) {
    await publish(
      scheduledTriggerChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
}