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

        // add success response
        return NextResponse.json({ success: true, message: "Webhook trigger processed successfully" }, { status: 200 });
        
    } catch (error) {
        console.error("Error in webhook trigger:", error);
        return NextResponse.json({ success: false, error: "Failed to process webhook trigger" }, { status: 500 });
    }
}