import { channel, topic } from "@inngest/realtime";

export const telegramChannelName = "telegram-execution";

export const telegramChannel = channel(telegramChannelName).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>(),
);