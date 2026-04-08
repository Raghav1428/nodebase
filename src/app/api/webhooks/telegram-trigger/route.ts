import { sendWorkflowExecution } from "@/inngest/utils";
import { type NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import prisma from "@/lib/db";
import { NodeType } from "@/generated/prisma";

const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    analytics: true,
});

export async function POST(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const workflowId = url.searchParams.get("workflowId");

        if (!workflowId) {
            return NextResponse.json(
                { success: false, error: "Workflow ID is required" },
                { status: 400 }
            );
        }

        // Find the telegram trigger node for this workflow
        const node = await prisma.node.findFirst({
            where: {
                workflowId,
                type: NodeType.TELEGRAM_TRIGGER,
            },
        });

        if (!node) {
            return NextResponse.json(
                { success: false, error: "Telegram Trigger node not found in this workflow" },
                { status: 404 }
            );
        }

        // Verify secret_token from Telegram
        const nodeData = node.data as Record<string, any>;
        const expectedSecret = nodeData?.secretToken;

        if (expectedSecret) {
            const providedSecret = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
            if (providedSecret !== expectedSecret) {
                return NextResponse.json(
                    { success: false, error: "Invalid or missing secret token" },
                    { status: 401 }
                );
            }
        }

        // Rate limit by workflowId
        const identifier = `telegram-trigger:${workflowId}`;
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

        // Parse the Telegram update
        let body: any;
        try {
            body = await req.json();
        } catch (error) {
            return NextResponse.json(
                { success: false, error: "Invalid JSON payload" },
                { status: 400 }
            );
        }

        // Extract message data from the Telegram update
        const message = body.message || body.edited_message || body.channel_post || body.edited_channel_post;

        if (!message) {
            // Telegram can send other types of updates (e.g. callback_query) — acknowledge but don't trigger
            return NextResponse.json({ success: true, message: "No message in update, skipped" }, { status: 200 });
        }

        const telegramData = {
            updateId: body.update_id,
            messageId: message.message_id,
            text: message.text || "",
            chatId: message.chat?.id,
            chatType: message.chat?.type,
            chatTitle: message.chat?.title,
            from: {
                id: message.from?.id,
                isBot: message.from?.is_bot,
                firstName: message.from?.first_name,
                lastName: message.from?.last_name,
                username: message.from?.username,
                languageCode: message.from?.language_code,
            },
            date: message.date,
            raw: message,
        };

        // Trigger the inngest job
        await sendWorkflowExecution({
            workflowId,
            initialData: {
                telegram: telegramData,
            },
        });

        // Telegram expects a 200 OK response
        return NextResponse.json(
            { success: true, message: "Telegram trigger processed successfully" },
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
        // Always return 200 to Telegram to prevent retries on server errors
        return NextResponse.json(
            { success: false, error: "Failed to process Telegram trigger" },
            { status: 200 }
        );
    }
}
