"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { mongodbChannel } from "@/inngest/channels/mongodb";
import { inngest } from "@/inngest/client";

export type MongoDBToken = Realtime.Token<
    typeof mongodbChannel,
    ["status"]
>;

export async function fetchMongoDBRealtimeToken(): Promise<MongoDBToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: mongodbChannel(),
        topics: ["status"],
    });

    return token;
}
