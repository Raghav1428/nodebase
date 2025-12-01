"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { openAIChannel } from "@/inngest/channels/openai";
import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";

export type OpenAIToken = Realtime.Token<
  typeof openAIChannel,
  ["status"]
>;

export async function fetchOpenAIRealtimeToken(): Promise<OpenAIToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: openAIChannel(),
    topics: ["status"],
  });

  return token;
}

export async function getAvailableOpenAIModels(credentialId: string): Promise<string[]> {
  
  const credential = await prisma.credential.findUnique({
    where: { id: credentialId },
  });

  if (!credential) {
    console.warn("Gemini models: credential not found");
    return ["gemini-2.0-flash"]; // fallback
  }

  const apiKey = credential.value;

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
