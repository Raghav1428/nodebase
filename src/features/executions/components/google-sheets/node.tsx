"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { GoogleSheetsDialog, GoogleSheetsFormValues } from "./dialog";
import { fetchGoogleSheetsRealtimeToken } from "./actions";
import { useNodeStatus } from "../../hooks/use-node-status";
import { googleSheetsChannelName } from "@/inngest/channels/google-sheets";

type GoogleSheetsNodeData = {
    variableName?: string;
    credentialId?: string;
    operation?: "create" | "append";
    spreadsheetTitle?: string;
    spreadsheetId?: string;
    dataVariable?: string;
}

type GoogleSheetsNodeType = Node<GoogleSheetsNodeData>

export const GoogleSheetsNode = memo((props: NodeProps<GoogleSheetsNodeType>) => {
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: googleSheetsChannelName,
        topic: "status",
        refreshToken: fetchGoogleSheetsRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);
    
    const handleSubmit = (values: GoogleSheetsFormValues) => {
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
    const description = nodeData?.operation === "append" 
        ? `Append to sheet` 
        : nodeData?.spreadsheetTitle 
            ? `Create: ${nodeData.spreadsheetTitle.slice(0, 20)}${nodeData.spreadsheetTitle.length > 20 ? '...' : ''}` 
            : "Not configured";
    
    return (
        <>
            <GoogleSheetsDialog 
                open={dialogOpen} 
                onOpenChange={setDialogOpen} 
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <BaseExecutionNode 
                {...props}
                id={props.id}
                icon="/logos/google-sheets.svg"
                name="Google Sheets"
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
                status={nodeStatus}
            />
        </>
    )
});

GoogleSheetsNode.displayName = "GoogleSheetsNode";
