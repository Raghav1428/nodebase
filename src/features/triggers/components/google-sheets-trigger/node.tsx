"use client";

import type { NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { GoogleSheetsTriggerDialog } from "./dialog";
import { googleSheetsTriggerChannelName } from "@/inngest/channels/google-sheets-trigger";
import { fetchGoogleSheetsTriggerRealtimeToken } from "./actions";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";


export const GoogleSheetsTriggerNode = memo((props: NodeProps) => {

    const [dialogOpen, setDialogOpen] = useState(false);

    const nodeStatus = useNodeStatus({
            nodeId: props.id,
            channel: googleSheetsTriggerChannelName,
            topic: "status",
            refreshToken: fetchGoogleSheetsTriggerRealtimeToken,
        });


    const handleOpenSettings = () => setDialogOpen(true);

    return (
        <>
            <GoogleSheetsTriggerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
            <BaseTriggerNode 
                {...props}
                id={props.id}
                icon="/logos/google-sheets.svg"
                name="Google Sheets"
                description="When sheet is edited"
                status={nodeStatus} 
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    )
});
