import { sendWorkflowExecution } from "@/inngest/utils";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import prisma from "@/lib/db";

const webhookBodySchema = z.any();

const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
});

export async function POST(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const workflowId = url.searchParams.get("workflowId");
        if (!workflowId) {
            return NextResponse.json({ success: false, error: "Workflow ID is required" }, { status: 400 });
        }

        const workflow = await prisma.workflow.findUnique({
            where: {
                id: workflowId,
            },
        });

        if (!workflow) {
            return NextResponse.json({ success: false, error: "Workflow not found" }, { status: 404 });
        }

        // Rate limit by workflowId (or IP as fallback)
        const identifier = `webhook:${workflowId}`;
        const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

        if (!success) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Rate limit exceeded. Please try again later.",
                    retryAfter: Math.ceil((reset - Date.now()) / 1000)
                },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
                        "X-RateLimit-Limit": String(limit),
                        "X-RateLimit-Remaining": String(remaining),
                        "X-RateLimit-Reset": String(reset),
                    }
                }
            );
        }

        let body: unknown;

        try {
            const rawBody = await req.text();
            body = webhookBodySchema.parse(JSON.parse(rawBody));
        } catch (error) {
            return NextResponse.json({ success: false, error: "Invalid webhook payload" }, { status: 400 });
        }

        const webhookData = {
            raw: body,
        };

        // Trigger the inngest job
        await sendWorkflowExecution({
            workflowId,
            initialData: {
                webhook: webhookData,
            },
        });

        // Success response with rate limit headers
        return NextResponse.json(
            { success: true, message: "Webhook trigger processed successfully" },
            {
                status: 200,
                headers: {
                    "X-RateLimit-Limit": String(limit),
                    "X-RateLimit-Remaining": String(remaining),
                    "X-RateLimit-Reset": String(reset),
                }
            }
        );

    } catch (error) {
        console.error("Error in webhook trigger:", error);
        return NextResponse.json({ success: false, error: `Failed to process webhook trigger` }, { status: 500 });
    }
}