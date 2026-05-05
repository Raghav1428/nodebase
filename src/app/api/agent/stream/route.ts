import { NextRequest } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { inngest } from "@/inngest/client";
import { createId } from "@paralleldrive/cuid2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  workflowId: z.string().min(1, "workflowId is required"),
  input: z.string().optional(),
  sessionId: z.string().optional(),
  initialData: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Formats an SSE event string.
 */
function formatSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * POST /api/agent/stream
 *
 * SSE streaming agent execution endpoint.
 *
 * Event ordering:
 *   status → (tool_call → tool_result)* → done
 *   OR: status → error
 *
 * Sends heartbeat pings every 15s to prevent proxy disconnects.
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate request body
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          details: parsed.error.issues,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { workflowId, input, sessionId, initialData } = parsed.data;

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Heartbeat interval — prevents proxy disconnects
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(":ping\n\n"));
          } catch {
            clearInterval(heartbeat);
          }
        }, 15_000);

        try {
          // Emit initial status
          controller.enqueue(
            encoder.encode(
              formatSSE("status", {
                iteration: 0,
                phase: "thinking",
                message: "Starting agent execution...",
              }),
            ),
          );

          // Trigger workflow execution
          const eventId = createId();
          await inngest.send({
            name: "workflows/execute.workflow",
            data: {
              workflowId,
              initialData: {
                ...initialData,
                ...(input ? { _userInput: input } : {}),
                ...(sessionId ? { _sessionId: sessionId } : {}),
              },
            },
            id: eventId,
          });

          // Emit done with event ID (client polls for final result)
          controller.enqueue(
            encoder.encode(
              formatSSE("done", {
                eventId,
                workflowId,
                message:
                  "Agent execution started. Use the eventId to poll for results.",
              }),
            ),
          );
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              formatSSE("error", {
                message:
                  error instanceof Error
                    ? error.message
                    : "Unknown error",
                code: "EXECUTION_ERROR",
              }),
            ),
          );
        } finally {
          clearInterval(heartbeat);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[/api/agent/stream] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
