import { channel, topic } from "@inngest/realtime";

export const openAIChatModelChannelName = "openai-chat-model-execution";

export const openAIChatModelChannel = channel(openAIChatModelChannelName).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>(),
);