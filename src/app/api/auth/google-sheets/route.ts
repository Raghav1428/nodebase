import { getAuthUrl } from "@/lib/google-sheets";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // State contains user ID for the callback
        const state = Buffer.from(JSON.stringify({ userId: session.user.id })).toString("base64");
        const authUrl = getAuthUrl(state);

        console.log("Google Sheets OAuth - Redirect URL:", authUrl);

        return NextResponse.redirect(authUrl);
    } catch (error) {
        console.error("Google Sheets OAuth error:", error);
        return NextResponse.json({ error: "Failed to initiate OAuth" }, { status: 500 });
    }
}
