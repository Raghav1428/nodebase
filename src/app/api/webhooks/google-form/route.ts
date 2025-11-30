import { sendWorkflowExecution } from "@/inngest/utils";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const workflowId = url.searchParams.get("workflowId");
        if (!workflowId) {
            return NextResponse.json({ success: false, error: "Workflow ID is required" }, { status: 400 });
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
    } catch (error) {
        console.error("Error in Google Form trigger webhook:", error);
        return NextResponse.json({ success: false, error: "Failed  to process Google Form submission" }, { status: 500 });
    }
}