import { channel, topic } from "@inngest/realtime";

export const webhookTriggerChannelName = "webhook-trigger-execution";

export const webhookTriggerChannel = channel(webhookTriggerChannelName).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>(),
);