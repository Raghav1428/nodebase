"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { TimerIcon } from "lucide-react";
import { memo, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { ScheduledTriggerDialog, ScheduledTriggerFormValues } from "./dialog";
import { scheduledTriggerChannelName } from "@/inngest/channels/scheduled-trigger";
import { fetchScheduledTriggerRealtimeToken } from "./actions";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

type ScheduledTriggerNodeData = {
    cronExpression?: string;
};

type ScheduledTriggerNodeType = Node<ScheduledTriggerNodeData>

export const ScheduledTriggerNode = memo((props: NodeProps<ScheduledTriggerNodeType>) => {
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: scheduledTriggerChannelName,
        topic: "status",
        refreshToken: fetchScheduledTriggerRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);
    
    const handleSubmit = (values: ScheduledTriggerFormValues) => {
        setNodes((nodes) => nodes.map((node) => {
            if(node.id === props.id) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        ...values,
                    }
                }
            }
            return node;
        }));
    }
    
    const nodeData = props.data;
    const description = nodeData?.cronExpression ? `Runs on: ${nodeData.cronExpression}` : "Not configured";
    
    return (
        <>
            <ScheduledTriggerDialog 
                open={dialogOpen} 
                onOpenChange={setDialogOpen} 
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <BaseTriggerNode 
                {...props}
                id={props.id}
                icon={TimerIcon}
                name="Schedule Trigger"
                description={description}
                status={nodeStatus} 
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    )
});

ScheduledTriggerNode.displayName = "ScheduledTriggerNode";
