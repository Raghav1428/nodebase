import { channel, topic } from "@inngest/realtime";

export const anthropicChatModelChannelName = "anthropic-chat-model-execution";

export const anthropicChatModelChannel = channel(anthropicChatModelChannelName).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>(),
);