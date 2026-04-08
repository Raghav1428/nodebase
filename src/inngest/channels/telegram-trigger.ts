import { channel, topic } from "@inngest/realtime";

export const telegramTriggerChannelName = "telegram-trigger-execution";

export const telegramTriggerChannel = channel(telegramTriggerChannelName).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>(),
);
