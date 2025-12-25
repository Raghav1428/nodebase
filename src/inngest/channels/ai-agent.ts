import { channel, topic } from "@inngest/realtime";

export const aiAgentChannelName = "ai-agent-execution";

export const aiAgentChannel = channel(aiAgentChannelName).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "tool_calling" | "success" | "error";
    }>(),
);
