import { channel, topic } from "@inngest/realtime";

export const manualTriggerChannelName = "manual-trigger-execution";

export const manualTriggerChannel = channel(manualTriggerChannelName).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>(),
);