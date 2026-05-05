import { NextRequest, NextResponse } from "next/server";
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
 * POST /api/agent/run
 *
 * Non-streaming agent execution endpoint.
 * Triggers an Inngest workflow execution and returns the event ID.
 *
 * The actual result is available via the execution record once the
 * workflow completes (poll via tRPC executions.getOne).
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Validate request body
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 },
      );
    }

    const { workflowId, input, sessionId, initialData } = parsed.data;

    // Trigger workflow execution via Inngest
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

    return NextResponse.json({
      success: true,
      eventId,
      workflowId,
      message: "Agent execution started. Poll executions API for results.",
    });
  } catch (error) {
    console.error("[/api/agent/run] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
