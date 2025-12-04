"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { scheduledTriggerChannel } from "@/inngest/channels/scheduled-trigger";
import { inngest } from "@/inngest/client";

export type ScheduledTriggerToken = Realtime.Token<
    typeof scheduledTriggerChannel,
    ["status"]
>;

export async function fetchScheduledTriggerRealtimeToken(): Promise<ScheduledTriggerToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: scheduledTriggerChannel(),
        topics: ["status"],
    });

    return token;
};