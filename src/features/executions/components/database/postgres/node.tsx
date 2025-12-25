"use client";

import { Position, useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { PostgresDialog, PostgresFormValues } from "./dialog";
import { fetchPostgresRealtimeToken } from "./actions";
import { useNodeStatus } from "../../../hooks/use-node-status";
import { postgresChannelName } from "@/inngest/channels/postgres";
import { WorkflowNode } from "@/components/workflow-node";
import { NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { BaseNode } from "@/components/react-flow/base-node";
import Image from "next/image";
import { BaseHandle } from "@/components/react-flow/base-handle";

type PostgresNodeData = {
    credentialId?: string;
    host?: string;
    port?: string;
    database?: string;
    tableName?: string;
    contextWindow?: string;
}

type PostgresNodeType = Node<PostgresNodeData>

export const PostgresNode = memo((props: NodeProps<PostgresNodeType>) => {
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, setEdges } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: postgresChannelName,
        topic: "status",
        refreshToken: fetchPostgresRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);
    
    const handleSubmit = (values: PostgresFormValues) => {
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
    const description = nodeData?.tableName 
        ? nodeData.tableName.length > 40 
            ? `${nodeData.tableName.slice(0, 40)}...` 
            : nodeData.tableName 
        : "Not configured";
    
    return (
        <>
            <PostgresDialog 
                open={dialogOpen} 
                onOpenChange={setDialogOpen} 
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <WorkflowNode
                name="PostgreSQL"
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
                        <Image src="/logos/postgres.svg" alt="PostgreSQL" width={24} height={24} />
                        <BaseHandle id="database-to-ai-agent" type="source" position={Position.Top} />
                    </BaseNode>
                </NodeStatusIndicator>
            </WorkflowNode>
        </>
    )
});

PostgresNode.displayName = "PostgresNode";
