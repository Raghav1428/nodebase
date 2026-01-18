"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { googleSheetsTriggerChannel } from "@/inngest/channels/google-sheets-trigger";
import { inngest } from "@/inngest/client";

export type GoogleSheetsTriggerToken = Realtime.Token<
    typeof googleSheetsTriggerChannel,
    ["status"]
>;

export async function fetchGoogleSheetsTriggerRealtimeToken(): Promise<GoogleSheetsTriggerToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: googleSheetsTriggerChannel(),
        topics: ["status"],
    });

    return token;
};
