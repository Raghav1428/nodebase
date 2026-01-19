"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { DiscordDialog, DiscordFormValues } from "./dialog";
import { fetchDiscordRealtimeToken } from "./actions";
import { useNodeStatus } from "../../hooks/use-node-status";
import { discordChannelName } from "@/inngest/channels/discord";

type DiscordNodeData = {
    variableName?: string;
    webhookUrl?: string;
    content?: string;
    username?: string;
};

type DiscordNodeType = Node<DiscordNodeData>

export const DiscordNode = memo((props: NodeProps<DiscordNodeType>) => {
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: discordChannelName,
        topic: "status",
        refreshToken: fetchDiscordRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);
    
    const handleSubmit = (values: DiscordFormValues) => {
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
            <DiscordDialog 
                open={dialogOpen} 
                onOpenChange={setDialogOpen} 
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <BaseExecutionNode 
                {...props}
                id={props.id}
                icon="/logos/discord.svg"
                name="Discord"
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
                status={nodeStatus}
                nodeData={nodeData as Record<string, unknown>}
            />
        </>
    )
});

DiscordNode.displayName = "DiscordNode";
