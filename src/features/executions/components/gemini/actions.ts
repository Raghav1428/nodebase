"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { geminiChannel } from "@/inngest/channels/gemini";
import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";

export type GeminiToken = Realtime.Token<
    typeof geminiChannel,
    ["status"]
>;

export async function fetchGeminiRealtimeToken(): Promise<GeminiToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: geminiChannel(),
        topics: ["status"],
    });

    return token;
};

export async function getAvailableGeminiModels(credentialId: string): Promise<string[]> {
    
    const credential = await prisma.credential.findUnique({
    where: { id: credentialId },
  });

  if (!credential) {
    console.warn("Gemini models: credential not found");
    return ["gemini-2.0-flash"]; // fallback
  }

  const apiKey = credential.value;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.statusText}`);
        }

        const data = await response.json();
        
        return data.models
            .filter(
                (m: any) =>
                m.supportedGenerationMethods?.includes("generateContent") &&
                m.name?.startsWith("models/gemini-")
            )
            .map((m: any) => m.name.replace("models/", ""))
            .sort();

    } catch (error) {
        console.error("Error fetching Gemini models:", error);
        return ["gemini-2.0-flash"];
    }
}