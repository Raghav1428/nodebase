import { getTokensFromCode, getOAuth2Client } from "@/lib/google-sheets";
import { encrypt } from "@/lib/encryption";
import prisma from "@/lib/db";
import { CredentialType } from "@/generated/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

// Get base URL for redirects
function getBaseUrl(): string {
    return process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}

// Verify signed state with HMAC for CSRF protection and timestamp validation
const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const CLOCK_SKEW_MS = 60 * 1000; // 1 minute allowed clock skew

function verifySignedState(state: string): { userId: string; ts: number } | null {
    try {
        const secret = process.env.BETTER_AUTH_SECRET;
        if (!secret) {
            console.error("BETTER_AUTH_SECRET must be configured");
            return null;
        }

        const decoded = Buffer.from(state, "base64").toString();
        const lastDotIndex = decoded.lastIndexOf(".");

        if (lastDotIndex === -1) return null;

        const payloadStr = decoded.substring(0, lastDotIndex);
        const signature = decoded.substring(lastDotIndex + 1);

        // Recompute expected signature
        const expectedSignature = crypto.createHmac("sha256", secret).update(payloadStr).digest("hex");

        // Length check before timing-safe comparison
        const signatureBuffer = Buffer.from(signature);
        const expectedBuffer = Buffer.from(expectedSignature);

        if (signatureBuffer.length !== expectedBuffer.length) {
            return null;
        }

        // Constant-time comparison to prevent timing attacks
        if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
            return null;
        }

        // Parse and validate payload after signature verification
        const payload = JSON.parse(payloadStr);

        // Validate timestamp to prevent replay attacks
        if (typeof payload.ts !== 'number') {
            console.error("State missing or invalid timestamp");
            return null;
        }

        const now = Date.now();
        const age = now - payload.ts;

        // Reject tokens from the future (beyond clock skew) or too old
        if (payload.ts > now + CLOCK_SKEW_MS) {
            console.error("State timestamp is in the future");
            return null;
        }

        if (age > STATE_EXPIRY_MS) {
            console.error("State has expired");
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}

export async function GET(req: NextRequest) {
    const baseUrl = getBaseUrl();

    try {
        const url = new URL(req.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        if (error) {
            return NextResponse.redirect(
                `${baseUrl}/credentials?error=oauth_denied`
            );
        }

        if (!code || !state) {
            return NextResponse.redirect(
                `${baseUrl}/credentials?error=missing_params`
            );
        }

        // Verify HMAC signature and extract payload
        const payload = verifySignedState(state);

        if (!payload || !payload.userId) {
            return NextResponse.redirect(
                `${baseUrl}/credentials?error=invalid_state`
            );
        }

        const { userId } = payload;

        // Exchange code for tokens
        const tokens = await getTokensFromCode(code);

        // Try to get user email for credential name (optional - may fail if API not enabled)
        let email = "Google Sheets Account";
        try {
            const oauth2Client = getOAuth2Client();
            oauth2Client.setCredentials(tokens);
            const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
            const userInfo = await oauth2.userinfo.get();
            email = userInfo.data.email || email;
        } catch (e) {
            console.log("Could not fetch user email, using default name");
        }

        // Store tokens as encrypted credential
        const credentialValue = JSON.stringify({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date,
            email: email,
        });

        await prisma.credential.create({
            data: {
                name: email,
                type: CredentialType.GOOGLE_SHEETS,
                value: encrypt(credentialValue),
                userId,
            },
        });

        revalidatePath("/credentials");
        return NextResponse.redirect(
            `${baseUrl}/credentials?success=google_sheets_connected`
        );
    } catch (error) {
        console.error("Google Sheets callback error:", error);
        return NextResponse.redirect(
            `${getBaseUrl()}/credentials?error=oauth_failed`
        );
    }
}
