"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { decrypt } from "@/lib/encryption";
import { anthropicChatModelChannel } from "@/inngest/channels/anthropic-chat-model";

export type AnthropicChatModelToken = Realtime.Token<
    typeof anthropicChatModelChannel,
    ["status"]
>;

export async function fetchAnthropicChatModelRealtimeToken(): Promise<AnthropicChatModelToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: anthropicChatModelChannel(),
        topics: ["status"],
    });

    return token;
};

export async function getAvailableAnthropicModels(credentialId: string): Promise<string[]> {
  
  const session = await auth.api.getSession({ headers: await headers() });
    if(!session?.user?.id){
        console.warn("Anthropic models: user not found");
        return ["claude-sonnet-4-20250514"]; // fallback
    }

    const credential = await prisma.credential.findFirst({
        where: { id: credentialId, userId: session.user.id },
    });

    if (!credential) {
        console.warn("Anthropic models: credential not found");
        return ["claude-sonnet-4-20250514"]; // fallback
    }

    const apiKey = credential.value;

    if (!apiKey) {
        console.warn("Anthropic models: credential has no value");
        return ["claude-sonnet-4-20250514"];
    }

  try {
    const response = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": decrypt(apiKey),
        "anthropic-version": "2023-06-01",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Anthropic models: ${response.statusText}`
      );
    }

    const data = await response.json();

    const list = Array.isArray(data.data) ? data.data : [];

    return (list ?? [])
      .filter((m: any) => typeof m.id === "string" && m.id.startsWith("claude-"))
      .map((m: any) => m.id as string)
      .sort();
  } catch (error) {
    console.error("Error fetching Anthropic models:", error);
    return ["claude-sonnet-4-20250514"];
  }
}