import { channel, topic } from "@inngest/realtime";

export const geminiChannelName = "gemini-execution";

export const geminiChannel = channel(geminiChannelName).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>(),
);