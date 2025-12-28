"use client";

import { Position, useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { McpToolsDialog, McpToolsFormValues } from "./dialog";
import { fetchMcpToolsRealtimeToken } from "./actions";
import { useNodeStatus } from "../../hooks/use-node-status";
import { mcpToolsChannelName } from "@/inngest/channels/mcp-tools";
import { WorkflowNode } from "@/components/workflow-node";
import { NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { BaseNode } from "@/components/react-flow/base-node";
import Image from "next/image";
import { BaseHandle } from "@/components/react-flow/base-handle";

type McpToolsNodeData = {
    variableName?: string;
    serverUrl?: string;
    transportType?: "sse" | "http" | "stdio";
    command?: string;
    args?: string;
}

type McpToolsNodeType = Node<McpToolsNodeData>

export const McpToolsNode = memo((props: NodeProps<McpToolsNodeType>) => {
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, setEdges } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: mcpToolsChannelName,
        topic: "status",
        refreshToken: fetchMcpToolsRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);
    
    const handleSubmit = (values: McpToolsFormValues) => {
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
    
    // Determine if properly configured based on transport type
    const isConfigured = nodeData?.transportType === "stdio" 
        ? !!nodeData?.command 
        : !!nodeData?.serverUrl;
    
    const getDescription = () => {
        if (!isConfigured) return "Not configured";
        if (nodeData?.transportType === "stdio") {
            return `${nodeData.command} ${nodeData.args || ""}`.trim();
        }
        return nodeData?.serverUrl || "Configured";
    };
    
    const description = getDescription();
    
    return (
        <>
            <McpToolsDialog 
                open={dialogOpen} 
                onOpenChange={setDialogOpen} 
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <WorkflowNode
                name="MCP Tools"
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
                        <Image src="/logos/mcp.svg" alt="MCP Tools" width={24} height={24} />
                        <BaseHandle id="tools-to-ai-agent" type="source" position={Position.Top} />
                    </BaseNode>

                </NodeStatusIndicator>

            </WorkflowNode>
        </>
    )
});

McpToolsNode.displayName = "McpToolsNode";
