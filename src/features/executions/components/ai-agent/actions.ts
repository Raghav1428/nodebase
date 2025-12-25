"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { aiAgentChannel } from "@/inngest/channels/ai-agent";
import { inngest } from "@/inngest/client";

export type AiAgentToken = Realtime.Token<
    typeof aiAgentChannel,
    ["status"]
>;

export async function fetchAiAgentRealtimeToken(): Promise<AiAgentToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: aiAgentChannel(),
        topics: ["status"],
    });

    return token;
}
