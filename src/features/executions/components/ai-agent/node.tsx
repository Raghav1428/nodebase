"use client";

import { useReactFlow, type Node, type NodeProps, Position, Handle } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseNode } from "@/components/react-flow/base-node";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { WorkflowNode } from "@/components/workflow-node";
import { type NodeStatus, NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { AiAgentDialog, AiAgentFormValues } from "./dialog";
import { fetchAiAgentRealtimeToken } from "./actions";
import { useNodeStatus } from "../../hooks/use-node-status";
import { aiAgentChannelName } from "@/inngest/channels/ai-agent";
import { DatabaseIcon, WrenchIcon, BrainIcon } from "lucide-react";
import Image from "next/image";

type AiAgentNodeData = {
    variableName?: string;
}

type AiAgentNodeType = Node<AiAgentNodeData>

export const AiAgentNode = memo((props: NodeProps<AiAgentNodeType>) => {
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, setEdges } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: aiAgentChannelName,
        topic: "status",
        refreshToken: fetchAiAgentRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);
    
    const handleSubmit = (values: AiAgentFormValues) => {
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
        setNodes((currentNodes) => {
            const updatedNodes = currentNodes.filter((node) => node.id !== props.id);
            return updatedNodes;
        });

        setEdges((currentEdges) => {
            const updatedEdges = currentEdges.filter((edge) => edge.source !== props.id && edge.target !== props.id);
            return updatedEdges;
        })
    };
    
    const nodeData = props.data;
    const description = nodeData?.variableName 
        ? `Agent: ${nodeData.variableName}` 
        : "Connect AI, DB & Tools";
    
    return (
        <>
            <AiAgentDialog 
                open={dialogOpen} 
                onOpenChange={setDialogOpen} 
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <WorkflowNode
                name="AI Agent"
                description={description}
                onDelete={handleDelete}
                onSettings={handleOpenSettings}
            >
                <NodeStatusIndicator
                    status={nodeStatus}
                    variant="border"
                >
                    <BaseNode 
                        onDoubleClick={handleOpenSettings} 
                        status={nodeStatus}
                        className="w-40 h-14 flex flex-col items-center justify-center px-3"
                    >
                        <div className="flex items-center gap-2">
                            <Image
                                src="/logos/ai-agent.svg"
                                alt="AI Agent"
                                width={18}
                                height={18}
                            />
                            <span className="text-sm font-medium text-foreground">AI Agent</span>
                        </div>
                        
                        <div className="flex justify-around w-full mt-2">
                            <BrainIcon className="size-3 text-muted-foreground/60" />
                            <DatabaseIcon className="size-3 text-muted-foreground/60" />
                            <WrenchIcon className="size-3 text-muted-foreground/60" />
                        </div>

                        <BaseHandle 
                            id="workflow-in"
                            type="target"
                            position={Position.Left}
                        />
                        
                        <BaseHandle 
                            id="workflow-out"
                            type="source"
                            position={Position.Right}
                        />
                        
                        <BaseHandle 
                            id="ai-model"
                            type="target"
                            position={Position.Bottom}
                            style={{ left: '20%' }}
                        />
                        
                        <BaseHandle 
                            id="database"
                            type="target"
                            position={Position.Bottom}
                            style={{ left: '50%' }}
                        />
                        
                        <BaseHandle 
                            id="tools"
                            type="target"
                            position={Position.Bottom}
                            style={{ left: '80%' }}
                        />
                    </BaseNode>
                </NodeStatusIndicator>
            </WorkflowNode>
        </>
    )
});

AiAgentNode.displayName = "AiAgentNode";
