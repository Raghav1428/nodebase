"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { decrypt } from "@/lib/encryption";
import { openRouterChatModelChannel } from "@/inngest/channels/openrouter-chat-model";

export type OpenRouterChatModelToken = Realtime.Token<
    typeof openRouterChatModelChannel,
    ["status"]
>;

export async function fetchOpenRouterChatModelRealtimeToken(): Promise<OpenRouterChatModelToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: openRouterChatModelChannel(),
        topics: ["status"],
    });

    return token;
};

export async function getAvailableOpenRouterModels(credentialId: string): Promise<string[]> {
  
  const session = await auth.api.getSession({ headers: await headers() });
    if(!session?.user?.id){
        console.warn("OpenRouter models: user not found");
        return ["gpt-4o-mini"]; // fallback
    }

    const credential = await prisma.credential.findFirst({
        where: { id: credentialId, userId: session.user.id },
    });

    if (!credential) {
        console.warn("OpenRouter models: credential not found");
        return ["gpt-4o-mini"]; // fallback
    }

    const apiKey = credential.value;

    if (!apiKey) {
        console.warn("OpenRouter models: credential has no value");
        return ["gpt-4o-mini"];
    }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${decrypt(apiKey)}`,
      },
      // cache for 1 hour
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch OpenRouter models: ${response.statusText}`);
    }

    const data = await response.json();

    return (
      (data.data ?? [])
        .map((m: any) => m.id as string)
        .sort()
    );
  } catch (error) {
    console.error("Error fetching OpenRouter models:", error);
    return ["gpt-4o-mini"]; // Fallback on error
  }
}
