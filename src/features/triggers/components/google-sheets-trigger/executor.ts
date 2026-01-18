import type { NodeExecutor } from "@/features/executions/types";
import { googleSheetsTriggerChannel } from "@/inngest/channels/google-sheets-trigger";

type GoogleSheetsTriggerData = Record<string, unknown>;

export const googleSheetsTriggerExecutor: NodeExecutor<GoogleSheetsTriggerData> = async ({ data, nodeId, context, step, publish }) => {

    await publish(
        googleSheetsTriggerChannel().status({
            nodeId,
            status: "loading",
        })
    );

    const result = await step.run("google-sheets-trigger", async () => context);

    await publish(
        googleSheetsTriggerChannel().status({
            nodeId,
            status: "success",
        })
    );
    return result;
};
