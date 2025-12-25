import { channel, topic } from "@inngest/realtime";

export const mcpToolsChannelName = "mcp-tools-execution";

export const mcpToolsChannel = channel(mcpToolsChannelName).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>(),
);
