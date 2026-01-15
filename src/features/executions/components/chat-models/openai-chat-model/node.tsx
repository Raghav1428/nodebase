"use client";

import { Position, useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { OpenAIChatModelDialog, OpenAIChatModelFormValues } from "./dialog";
import { fetchOpenAIChatModelRealtimeToken } from "./actions";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { openAIChatModelChannelName } from "@/inngest/channels/openai-chat-model";
import { WorkflowNode } from "@/components/workflow-node";
import { NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { BaseNode } from "@/components/react-flow/base-node";
import Image from "next/image";
import { BaseHandle } from "@/components/react-flow/base-handle";

type OpenAIChatModelNodeData = {
    credentialId?: string;
    model?: any;
    systemPrompt?: string;
    userPrompt?: string;
}

type OpenAIChatModelNodeType = Node<OpenAIChatModelNodeData>

export const OpenAIChatModelNode = memo((props: NodeProps<OpenAIChatModelNodeType>) => {
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, setEdges } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: openAIChatModelChannelName,
        topic: "status",
        refreshToken: fetchOpenAIChatModelRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);
    
    const handleSubmit = (values: OpenAIChatModelFormValues) => {
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
        setEdges((edges) => edges.filter((edge) => edge.source !== props.id && edge.target !== props.id));
    }
    
    const nodeData = props.data;
    const description = nodeData?.userPrompt ? `${nodeData.model || "gpt-4o-mini"}: ${nodeData.userPrompt.slice(0, 50)}...` : "Not configured";
    
    return (
        <>
            <OpenAIChatModelDialog 
                open={dialogOpen} 
                onOpenChange={setDialogOpen} 
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <WorkflowNode
                name="OpenAI Chat Model"
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
                        <Image src="/logos/openai.svg" alt="OpenAI" width={24} height={24} className="dark-invert" />
                        <BaseHandle id="model-to-ai-agent" type="source" position={Position.Top} />
                    </BaseNode>

                </NodeStatusIndicator>

            </WorkflowNode>
        </>
    )
});

OpenAIChatModelNode.displayName = "OpenAIChatModelNode";
