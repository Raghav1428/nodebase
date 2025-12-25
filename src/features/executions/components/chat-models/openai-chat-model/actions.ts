"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { decrypt } from "@/lib/encryption";
import { openAIChatModelChannel } from "@/inngest/channels/openai-chat-model";

export type OpenAIChatModelToken = Realtime.Token<
    typeof openAIChatModelChannel,
    ["status"]
>;

export async function fetchOpenAIChatModelRealtimeToken(): Promise<OpenAIChatModelToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: openAIChatModelChannel(),
        topics: ["status"],
    });

    return token;
};

export async function getAvailableOpenAIModels(credentialId: string): Promise<string[]> {
  
  const session = await auth.api.getSession({ headers: await headers() });
    if(!session?.user?.id){
        console.warn("OpenAI models: user not found");
        return ["gpt-4o-mini"]; // fallback
    }

    const credential = await prisma.credential.findFirst({
        where: { id: credentialId, userId: session.user.id },
    });

    if (!credential) {
        console.warn("OpenAI models: credential not found");
        return ["gpt-4o-mini"]; // fallback
    }

    const apiKey = credential.value;

    if (!apiKey) {
        console.warn("OpenAI models: credential has no value");
        return ["gpt-4o-mini"];
    }

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${decrypt(apiKey)}`,
      },
      // cache for 1 hour
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAI models: ${response.statusText}`);
    }

    const data = await response.json();

    return (
      data.data
        // keep only chat-ish models; tweak this as you like
        .filter(
          (m: any) =>
            typeof m.id === "string" &&
            (m.id.startsWith("gpt-") || m.id.startsWith("o"))
        )
        .map((m: any) => m.id as string)
        .sort()
    );
  } catch (error) {
    console.error("Error fetching OpenAI models:", error);
    return ["gpt-4o-mini"]; // Fallback on error
  }
}
