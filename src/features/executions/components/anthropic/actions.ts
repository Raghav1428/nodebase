"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { anthropicChannel } from "@/inngest/channels/anthropic";

export type AnthropicToken = Realtime.Token<
  typeof anthropicChannel,
  ["status"]
>;

export async function fetchAnthropicRealtimeToken(): Promise<AnthropicToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: anthropicChannel(),
    topics: ["status"],
  });

  return token;
}

export async function getAvailableAnthropicModels(): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn("Anthropic API key missing");
    return ["claude-sonnet-4-20250514"]; // Valid fallback
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
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

    return list
      .filter((m: any) => 
        typeof m.id === "string" && m.id.startsWith("claude-")
      )
      .map((m: any) => m.id as string)
      .sort();
  } catch (error) {
    console.error("Error fetching Anthropic models:", error);
    return ["claude-sonnet-4-20250514"];
  }
}