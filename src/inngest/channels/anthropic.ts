import { channel, topic } from "@inngest/realtime";

export const anthropicChannelName = "anthropic-execution";

export const anthropicChannel = channel(anthropicChannelName).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>(),
);