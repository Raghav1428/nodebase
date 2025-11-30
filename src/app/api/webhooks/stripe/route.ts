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
        const stripeData = {
            // event metadata
            eventId: body.id,
            eventType: body.type,
            timestamp: body.created,
            livemode: body.livemode,
            raw: body.data?.object,
        };

        // Trigger the inngest job
        await sendWorkflowExecution({
            workflowId,
            initialData: {
                stripe: stripeData,
            },
        });

        // add success response
        return NextResponse.json({ success: true, message: "Stripe trigger webhook processed successfully" }, { status: 200 });
        
    } catch (error) {
        console.error("Error in Stripe trigger webhook:", error);
        return NextResponse.json({ success: false, error: "Failed to process Stripe trigger" }, { status: 500 });
    }
}