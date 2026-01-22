import { sendWorkflowExecution } from "@/inngest/utils";
import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/db";
import { NodeType } from "@/generated/prisma";
import { decrypt } from "@/lib/encryption";

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get("Stripe-Signature") as string;
    const url = new URL(req.url);
    const workflowId = url.searchParams.get("workflowId");

    if (!workflowId) {
        return NextResponse.json({ success: false, error: "Workflow ID is required" }, { status: 400 });
    }

    // Fetch the Stripe Trigger node to get the user's credential
    const node = await prisma.node.findFirst({
        where: {
            workflowId,
            type: NodeType.STRIPE_TRIGGER,
        },
        include: {
            credential: true
        }
    });

    if (!node) {
        return NextResponse.json({
            success: false,
            error: "Stripe Trigger node not found in this workflow",
            workflowId
        }, { status: 404 });
    }

    if (!node.credential) {
        return NextResponse.json({
            success: false,
            error: "No credential linked to Stripe Trigger node. Please select a credential in the node settings and save the workflow.",
            nodeId: node.id,
            credentialId: node.credentialId
        }, { status: 404 });
    }

    const webhookSecret = decrypt(node.credential.value);

    // Create a minimal Stripe instance for webhook verification only
    // Note: constructEvent doesn't make API calls, so this placeholder key works
    const stripe = new Stripe("sk_placeholder_for_webhook_verification", {
        apiVersion: "2025-12-15.clover",
    });

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            webhookSecret
        );
    } catch (err) {
        return NextResponse.json({ success: false, error: "Webhook signature verification failed" }, { status: 400 });
    }

    try {
        const stripeData = {
            eventId: event.id,
            eventType: event.type,
            timestamp: event.created,
            livemode: event.livemode,
            raw: event.data.object,
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
        return NextResponse.json({ success: false, error: "Failed to process Stripe trigger" }, { status: 500 });
    }
}