"use client";

import { Position, useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { GeminiChatModelDialog, GeminiChatModelFormValues } from "./dialog";
import { fetchGeminiChatModelRealtimeToken } from "./actions";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { geminiChatModelChannelName } from "@/inngest/channels/gemini-chat-model";
import { WorkflowNode } from "@/components/workflow-node";
import { NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { BaseNode } from "@/components/react-flow/base-node";
import Image from "next/image";
import { BaseHandle } from "@/components/react-flow/base-handle";

type GeminiChatModelNodeData = {
    credentialId?: string;
    model?: any;
    systemPrompt?: string;
    userPrompt?: string;
}

type GeminiChatModelNodeType = Node<GeminiChatModelNodeData>

export const GeminiChatModelNode = memo((props: NodeProps<GeminiChatModelNodeType>) => {
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: geminiChatModelChannelName,
        topic: "status",
        refreshToken: fetchGeminiChatModelRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);
    
    const handleSubmit = (values: GeminiChatModelFormValues) => {
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
    
    const handleDelete = () => {
        setNodes((nodes) => nodes.filter((node) => node.id !== props.id));
    }
    
    const nodeData = props.data;
    const description = nodeData?.userPrompt ? `${nodeData.model || "gemini-1.5-flash"}: ${nodeData.userPrompt.slice(0, 50)}...` : "Not configured";
    
    return (
        <>
            <GeminiChatModelDialog 
                open={dialogOpen} 
                onOpenChange={setDialogOpen} 
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <WorkflowNode
                name="Gemini Chat Model"
                description={description}
                onDelete={handleDelete}
                onSettings={handleOpenSettings}
            >
                <NodeStatusIndicator
                    status={nodeStatus}
                    variant="border"
                    rounded="full"
                >
                    <BaseNode
                        onDoubleClick={handleOpenSettings}
                        status={nodeStatus}
                        rounded="full"
                        className="p-2 rounded-full"
                    >
                        <Image src="/logos/gemini.svg" alt="Gemini" width={24} height={24} />
                        <BaseHandle id="model-to-ai-agent" type="source" position={Position.Top} />
                    </BaseNode>

                </NodeStatusIndicator>

            </WorkflowNode>
        </>
    )
});

GeminiChatModelNode.displayName = "GeminiChatModelNode";
