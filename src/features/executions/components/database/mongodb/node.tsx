"use client";

import { Position, useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { MongoDBDialog, MongoDBFormValues } from "./dialog";
import { fetchMongoDBRealtimeToken } from "./actions";
import { useNodeStatus } from "../../../hooks/use-node-status";
import { mongodbChannelName } from "@/inngest/channels/mongodb";
import { WorkflowNode } from "@/components/workflow-node";
import { NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { BaseNode } from "@/components/react-flow/base-node";
import Image from "next/image";
import { BaseHandle } from "@/components/react-flow/base-handle";

type MongoDBNodeData = {
    credentialId?: string;
    database?: string;
    collectionName?: string;
    contextWindow?: string;
}

type MongoDBNodeType = Node<MongoDBNodeData>

export const MongoDBNode = memo((props: NodeProps<MongoDBNodeType>) => {
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: mongodbChannelName,
        topic: "status",
        refreshToken: fetchMongoDBRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);
    
    const handleSubmit = (values: MongoDBFormValues) => {
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
    const description = nodeData?.collectionName 
        ? nodeData.collectionName.length > 40 
            ? `${nodeData.collectionName.slice(0, 40)}...` 
            : nodeData.collectionName 
        : "Not configured";
    
    return (
        <>
            <MongoDBDialog 
                open={dialogOpen} 
                onOpenChange={setDialogOpen} 
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <WorkflowNode
                name="MongoDB"
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
                        <Image src="/logos/mongodb.svg" alt="MongoDB" width={24} height={24} />
                        <BaseHandle id="database-to-ai-agent" type="source" position={Position.Top} />
                    </BaseNode>
                </NodeStatusIndicator>
            </WorkflowNode>
        </>
    )
});

MongoDBNode.displayName = "MongoDBNode";
