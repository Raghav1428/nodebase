import { channel, topic } from "@inngest/realtime";

export const openAIChannelName = "openai-execution";

export const openAIChannel = channel(openAIChannelName).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>(),
);