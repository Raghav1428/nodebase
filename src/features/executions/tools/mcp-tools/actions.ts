"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { mcpToolsChannel } from "@/inngest/channels/mcp-tools";
import { inngest } from "@/inngest/client";

export type McpToolsToken = Realtime.Token<
    typeof mcpToolsChannel,
    ["status"]
>;

export async function fetchMcpToolsRealtimeToken(): Promise<McpToolsToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: mcpToolsChannel(),
        topics: ["status"],
    });

    return token;
}
