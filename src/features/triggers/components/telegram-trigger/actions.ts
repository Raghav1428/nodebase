"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { telegramTriggerChannel } from "@/inngest/channels/telegram-trigger";
import { inngest } from "@/inngest/client";

export type TelegramTriggerToken = Realtime.Token<
    typeof telegramTriggerChannel,
    ["status"]
>;

export async function fetchTelegramTriggerRealtimeToken(): Promise<TelegramTriggerToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: telegramTriggerChannel(),
        topics: ["status"],
    });

    return token;
}

export async function setTelegramWebhook({
    botToken,
    webhookUrl,
    secretToken,
}: {
    botToken: string;
    webhookUrl: string;
    secretToken: string;
}): Promise<{ ok: boolean; description?: string }> {
    const response = await fetch(
        `https://api.telegram.org/bot${botToken}/setWebhook`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: webhookUrl,
                secret_token: secretToken,
                allowed_updates: ["message"],
            }),
        }
    );

    const data = await response.json();
    return { ok: data.ok, description: data.description };
}

export async function removeTelegramWebhook({
    botToken,
}: {
    botToken: string;
}): Promise<{ ok: boolean; description?: string }> {
    const response = await fetch(
        `https://api.telegram.org/bot${botToken}/deleteWebhook`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        }
    );

    const data = await response.json();
    return { ok: data.ok, description: data.description };
}
