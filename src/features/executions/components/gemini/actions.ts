"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { geminiChannel } from "@/inngest/channels/gemini";
import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { decrypt } from "@/lib/encryption";

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
    
    const session = await auth.api.getSession({ headers: await headers() });
    if(!session?.user?.id){
        return ["gemini-2.0-flash"]; // fallback
    }

    const credential = await prisma.credential.findFirst({
        where: { id: credentialId, userId: session.user.id },
    });

    if (!credential) {
        return ["gemini-2.0-flash"]; // fallback
    }

    const apiKey = credential.value;

    if (!apiKey) {
        return ["gemini-2.0-flash"];
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models`, {
            headers: {
                'X-goog-api-key': decrypt(apiKey)
            },  
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.statusText}`);
        }

        const data = await response.json();
        
        return (data.models ?? [])
            .filter(
                (m: any) =>
                m.supportedGenerationMethods?.includes("generateContent") &&
                m.name?.startsWith("models/gemini-")
            )
            .map((m: any) => m.name.replace("models/", ""))
            .sort();

    } catch (error) {
        return ["gemini-2.0-flash"];
    }
}