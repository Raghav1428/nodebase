"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { MousePointer2Icon } from "lucide-react";
import { memo, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { ManualTriggerDialog } from "./dialog";
import { manualTriggerChannelName } from "@/inngest/channels/manual-trigger";
import { fetchManualTriggerRealtimeToken } from "./actions";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";


export const ManualTriggerNode = memo((props: NodeProps) => {

    const [dialogOpen, setDialogOpen] = useState(false);

    const nodeStatus = useNodeStatus({
            nodeId: props.id,
            channel: manualTriggerChannelName,
            topic: "status",
            refreshToken: fetchManualTriggerRealtimeToken,
        });

    const handleOpenSettings = () => setDialogOpen(true);

    return (
        <>
            <ManualTriggerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
            <BaseTriggerNode 
                {...props}
                id={props.id}
                icon={MousePointer2Icon}
                name="When clicked 'Executes Workflow'"
                status={nodeStatus} 
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
                dataOnboarding="manual-trigger-node"
            />
        </>
    )
});
