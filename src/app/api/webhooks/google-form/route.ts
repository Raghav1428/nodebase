import { sendWorkflowExecution } from "@/inngest/utils";
import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { NodeType } from "@/generated/prisma";

export async function POST(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const workflowId = url.searchParams.get("workflowId");
        const secret = req.headers.get("X-Secret");

        if (!workflowId) {
            return NextResponse.json({ success: false, error: "Workflow ID is required" }, { status: 400 });
        }

        const node = await prisma.node.findFirst({
            where: {
                workflowId,
                type: NodeType.GOOGLE_FORM_TRIGGER,
            }
        });

        if (!node) {
            return NextResponse.json({ success: false, error: "Google Form Trigger not found" }, { status: 404 });
        }

        const data = (node.data as Record<string, any>) || {};
        const expectedSecret = data.secret;

        // Secrets are always required
        if (!expectedSecret) {
            return NextResponse.json({ success: false, error: "Unauthorized: Webhook secret not configured" }, { status: 401 });
        }

        if (!secret || secret !== expectedSecret) {
            return NextResponse.json({ success: false, error: "Unauthorized: Invalid or missing secret" }, { status: 401 });
        }

        const body = await req.json();
        const formData = {
            formId: body.formId,
            formTitle: body.formTitle,
            responseId: body.responseId,
            timestamp: body.timestamp,
            respondentEmail: body.respondentEmail,
            responses: body.responses,
            raw: body,
        };

        // Trigger the inngest job
        await sendWorkflowExecution({
            workflowId,
            initialData: {
                googleForm: formData,
            },
        });

        return NextResponse.json({ success: true, message: "Google Form trigger webhook processed successfully" }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ success: false, error: "Failed to process Google Form submission" }, { status: 500 });
    }
}
