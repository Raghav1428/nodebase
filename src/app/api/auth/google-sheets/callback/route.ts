import { getTokensFromCode, getOAuth2Client } from "@/lib/google-sheets";
import { encrypt } from "@/lib/encryption";
import prisma from "@/lib/db";
import { CredentialType } from "@/generated/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

// Get base URL for redirects
function getBaseUrl(): string {
    return process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
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

        const { userId } = JSON.parse(Buffer.from(state, "base64").toString());

        if (!userId) {
            return NextResponse.redirect(
                `${baseUrl}/credentials?error=invalid_state`
            );
        }

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
