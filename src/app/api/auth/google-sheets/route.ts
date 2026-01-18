import { getAuthUrl } from "@/lib/google-sheets";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";

// Create signed state with HMAC for CSRF protection
function createSignedState(payload: object): string {
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret) {
        console.error("STATE_SECRET or BETTER_AUTH_SECRET must be configured");
        return "";
    }
    const payloadStr = JSON.stringify(payload);
    const signature = crypto.createHmac("sha256", secret).update(payloadStr).digest("hex");
    return Buffer.from(`${payloadStr}.${signature}`).toString("base64");
}

export async function GET() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const state = createSignedState({
            userId: session.user.id,
            ts: Date.now()
        });
        const authUrl = getAuthUrl(state);

        return NextResponse.redirect(authUrl);
    } catch (error) {
        console.error("Google Sheets OAuth error:", error);
        return NextResponse.json({ error: "Failed to initiate OAuth" }, { status: 500 });
    }
}
