import { channel, topic } from "@inngest/realtime";

export const geminiChatModelChannelName = "gemini-chat-model-execution";

export const geminiChatModelChannel = channel(geminiChatModelChannelName).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>(),
);