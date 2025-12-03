import { NextRequest, NextResponse } from "next/server";
import { getSubscriptionToken } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { requireAuth } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session?.user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const token = await getSubscriptionToken(inngest, {
    channel: `user:${userId}`,
    topics: ["executions"],
  });

  return NextResponse.json(token);
}
