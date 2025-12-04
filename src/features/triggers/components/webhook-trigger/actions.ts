"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { webhookTriggerChannel } from "@/inngest/channels/webhook-trigger";
import { inngest } from "@/inngest/client";

export type WebhookTriggerToken = Realtime.Token<
    typeof webhookTriggerChannel,
    ["status"]
>;

export async function fetchWebhookTriggerRealtimeToken(): Promise<WebhookTriggerToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: webhookTriggerChannel(),
        topics: ["status"],
    });

    return token;
};