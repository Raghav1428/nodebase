import { channel, topic } from "@inngest/realtime";

export const openRouterChannelName = "openrouter-execution";

export const openRouterChannel = channel(openRouterChannelName).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>(),
);