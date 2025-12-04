"use client";

import type { NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { WebhookTriggerDialog } from "./dialog";
import { fetchWebhookTriggerRealtimeToken } from "./actions";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { webhookTriggerChannelName } from "@/inngest/channels/webhook-trigger";


export const WebhookTriggerNode = memo((props: NodeProps) => {

    const [dialogOpen, setDialogOpen] = useState(false);

    const nodeStatus = useNodeStatus({
            nodeId: props.id,
            channel: webhookTriggerChannelName,
            topic: "status",
            refreshToken: fetchWebhookTriggerRealtimeToken,
        });


    const handleOpenSettings = () => setDialogOpen(true);

    return (
        <>
            <WebhookTriggerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
            <BaseTriggerNode 
                {...props}
                id={props.id}
                icon="/logos/webhook.svg"
                name="Webhook"
                description="When webhook is captured"
                status={nodeStatus}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    )
});
