"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { TelegramDialog, TelegramFormValues } from "./dialog";
import { fetchTelegramRealtimeToken } from "./actions";
import { useNodeStatus } from "../../hooks/use-node-status";
import { telegramChannelName } from "@/inngest/channels/telegram";

type TelegramNodeData = {
    variableName?: string;
    botToken?: string;
    chatId?: string;
    content?: string;
};

type TelegramNodeType = Node<TelegramNodeData>

export const TelegramNode = memo((props: NodeProps<TelegramNodeType>) => {
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: telegramChannelName,
        topic: "status",
        refreshToken: fetchTelegramRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);
    
    const handleSubmit = (values: TelegramFormValues) => {
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
            <TelegramDialog 
                open={dialogOpen} 
                onOpenChange={setDialogOpen} 
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <BaseExecutionNode 
                {...props}
                id={props.id}
                icon="/logos/telegram.svg"
                name="Telegram"
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
                status={nodeStatus}
                nodeData={nodeData as Record<string, unknown>}
            />
        </>
    )
});

TelegramNode.displayName = "TelegramNode";
