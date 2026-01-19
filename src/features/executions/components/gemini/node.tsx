"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { GeminiDialog, GeminiFormValues } from "./dialog";
import { fetchGeminiRealtimeToken } from "./actions";
import { useNodeStatus } from "../../hooks/use-node-status";
import { geminiChannelName } from "@/inngest/channels/gemini";

type GeminiNodeData = {
    variableName?: string;
    credentialId?: string;
    model?: any;
    systemPrompt?: string;
    userPrompt?: string;
}

type GeminiNodeType = Node<GeminiNodeData>

export const GeminiNode = memo((props: NodeProps<GeminiNodeType>) => {
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: geminiChannelName,
        topic: "status",
        refreshToken: fetchGeminiRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);
    
    const handleSubmit = (values: GeminiFormValues) => {
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
    const description = nodeData?.userPrompt ? `${nodeData.model || "gemini-1.5-flash"}: ${nodeData.userPrompt.slice(0, 50)}...` : "Not configured";
    
    return (
        <>
            <GeminiDialog 
                open={dialogOpen} 
                onOpenChange={setDialogOpen} 
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <BaseExecutionNode 
                {...props}
                id={props.id}
                icon="/logos/gemini.svg"
                name="Gemini"
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
                status={nodeStatus}
                nodeData={nodeData as Record<string, unknown>}
            />
        </>
    )
});

GeminiNode.displayName = "GeminiNode";
