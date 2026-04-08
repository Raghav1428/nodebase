"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { TelegramTriggerDialog } from "./dialog";
import { fetchTelegramTriggerRealtimeToken } from "./actions";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { telegramTriggerChannelName } from "@/inngest/channels/telegram-trigger";

type TelegramTriggerNodeData = {
    botToken?: string;
    secretToken?: string;
    webhookActive?: boolean;
}

type TelegramTriggerNodeType = Node<TelegramTriggerNodeData>

export const TelegramTriggerNode = memo((props: NodeProps<TelegramTriggerNodeType>) => {

    const [dialogOpen, setDialogOpen] = useState(false);

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: telegramTriggerChannelName,
        topic: "status",
        refreshToken: fetchTelegramTriggerRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    const description = props.data?.webhookActive
        ? "Listening for messages"
        : "Not configured";

    return (
        <>
            <TelegramTriggerDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                nodeId={props.id}
                defaultValues={props.data}
            />
            <BaseTriggerNode
                {...props}
                id={props.id}
                icon="/logos/telegram.svg"
                name="Telegram"
                description={description}
                status={nodeStatus}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    )
});

TelegramTriggerNode.displayName = "TelegramTriggerNode";
