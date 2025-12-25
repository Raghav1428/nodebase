import { channel, topic } from "@inngest/realtime";

export const openRouterChatModelChannelName = "openrouter-chat-model-execution";

export const openRouterChatModelChannel = channel(openRouterChatModelChannelName).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>(),
);