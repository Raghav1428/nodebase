"use client";

import type { NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { StripeTriggerDialog } from "./dialog";
import { fetchStripeTriggerRealtimeToken } from "./actions";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { stripeTriggerChannelName } from "@/inngest/channels/stripe-trigger";


export const StripeTriggerNode = memo((props: NodeProps) => {

    const [dialogOpen, setDialogOpen] = useState(false);

    const nodeStatus = useNodeStatus({
            nodeId: props.id,
            channel: stripeTriggerChannelName,
            topic: "status",
            refreshToken: fetchStripeTriggerRealtimeToken,
        });


    const handleOpenSettings = () => setDialogOpen(true);

    return (
        <>
            <StripeTriggerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
            <BaseTriggerNode 
                {...props}
                id={props.id}
                icon="/logos/stripe.svg"
                name="Stripe"
                description="When stripe event is captured"
                status={nodeStatus} 
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    )
});
