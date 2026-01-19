"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { OpenRouterDialog, OpenRouterFormValues } from "./dialog";
import { fetchOpenRouterRealtimeToken } from "./actions";
import { useNodeStatus } from "../../hooks/use-node-status";
import { openRouterChannelName } from "@/inngest/channels/openrouter";

type OpenRouterNodeData = {
    variableName?: string;
    credentialId?: string;
    model?: any;
    systemPrompt?: string;
    userPrompt?: string;
}

type OpenRouterNodeType = Node<OpenRouterNodeData>

export const OpenRouterNode = memo((props: NodeProps<OpenRouterNodeType>) => {
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: openRouterChannelName,
        topic: "status",
        refreshToken: fetchOpenRouterRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);
    
    const handleSubmit = (values: OpenRouterFormValues) => {
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
    const description = nodeData?.userPrompt ? `${nodeData.model || "gpt-4"}: ${nodeData.userPrompt.slice(0, 50)}...` : "Not configured";
    
    return (
        <>
            <OpenRouterDialog 
                open={dialogOpen} 
                onOpenChange={setDialogOpen} 
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <BaseExecutionNode 
                {...props}
                id={props.id}
                icon="/logos/openrouter.svg"
                name="OpenRouter"
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
                status={nodeStatus}
                nodeData={nodeData as Record<string, unknown>}
            />
        </>
    )
});

OpenRouterNode.displayName = "OpenRouterNode";
