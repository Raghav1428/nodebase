"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { SlackDialog, SlackFormValues } from "./dialog";
import { fetchSlackRealtimeToken } from "./actions";
import { useNodeStatus } from "../../hooks/use-node-status";
import { slackChannelName } from "@/inngest/channels/slack";

type SlackNodeData = {
    variableName?: string;
    webhookUrl?: string;
    content?: string;
};

type SlackNodeType = Node<SlackNodeData>

export const SlackNode = memo((props: NodeProps<SlackNodeType>) => {
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: slackChannelName,
        topic: "status",
        refreshToken: fetchSlackRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);
    
    const handleSubmit = (values: SlackFormValues) => {
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
    const description = nodeData?.content ? `Send ${nodeData.content.slice(0, 50)}${nodeData.content.length > 50 ? '...' : ''}` : "Not configured";
    
    return (
        <>
            <SlackDialog 
                open={dialogOpen} 
                onOpenChange={setDialogOpen} 
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <BaseExecutionNode 
                {...props}
                id={props.id}
                icon="/logos/slack.svg"
                name="Slack"
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
                status={nodeStatus}
            />
        </>
    )
});

SlackNode.displayName = "SlackNode";
