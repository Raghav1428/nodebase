"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { EmailDialog, EmailFormValues } from "./dialog";
import { fetchEmailRealtimeToken } from "./actions";
import { useNodeStatus } from "../../hooks/use-node-status";
import { emailChannelName } from "@/inngest/channels/email";

type EmailNodeData = {
    variableName?: string;
    credentialId?: string;
    to?: string;
    subject?: string;
    body?: string;
}

type EmailNodeType = Node<EmailNodeData>

export const EmailNode = memo((props: NodeProps<EmailNodeType>) => {
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: emailChannelName,
        topic: "status",
        refreshToken: fetchEmailRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);
    
    const handleSubmit = (values: EmailFormValues) => {
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
    const description = nodeData?.to ? `Send to ${nodeData.to.slice(0, 30)}${nodeData.to.length > 30 ? '...' : ''}` : "Not configured";
    
    return (
        <>
            <EmailDialog 
                open={dialogOpen} 
                onOpenChange={setDialogOpen} 
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <BaseExecutionNode 
                {...props}
                id={props.id}
                icon="/logos/email.svg"
                name="Email"
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
                status={nodeStatus}
                nodeData={nodeData as Record<string, unknown>}
            />
        </>
    )
});

EmailNode.displayName = "EmailNode";
