import { channel, topic } from "@inngest/realtime";

export const scheduledTriggerChannelName = "scheduled-trigger-execution";

export const scheduledTriggerChannel = channel(scheduledTriggerChannelName).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>(),
);