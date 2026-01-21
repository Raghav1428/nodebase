"use client";

import { type NodeProps, Position, useReactFlow } from "@xyflow/react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { memo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { WorkflowNode } from "@/components/workflow-node";
import { type NodeStatus, NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { getLogoClassName } from "@/lib/logo-utils";
import { useHasActiveSubscription } from "@/features/subscriptions/hooks/use-subscription";
import { useUpgradeModal } from "@/hooks/use-upgrade-modal";
import { TestNodeDialog } from "./test-node-dialog";

interface BaseExecutionNodeProps extends NodeProps {
    icon: LucideIcon | string;
    name: string;
    description?: string;
    children?: ReactNode;
    status?: NodeStatus;
    onSettings?: () => void;
    onDoubleClick?: () => void;
    nodeData?: Record<string, unknown>;
};

export const BaseExecutionNode = memo(
    ({
        id,
        icon: Icon,
        name,
        description,
        children,
        status = "initial",
        onSettings,
        onDoubleClick,
        nodeData = {},
        dataOnboarding,
    }: BaseExecutionNodeProps & { dataOnboarding?: string }) => {

        const params = useParams();
        const workflowId = params.workflowId as string | undefined;
        const { setNodes, setEdges } = useReactFlow();
        const [testDialogOpen, setTestDialogOpen] = useState(false);
        const { hasActiveSubscription, isLoading: isSubscriptionLoading } = useHasActiveSubscription();
        const { modal: upgradeModal, setOpen: setUpgradeModalOpen } = useUpgradeModal();
        
        const handleDelete = () => {
            setNodes((currentNodes) => {
                const updatedNodes = currentNodes.filter((node) => node.id !== id);
                return updatedNodes;
            });

            setEdges((currentEdges) => {
                const updatedEdges = currentEdges.filter((edge) => edge.source !== id && edge.target !== id);
                return updatedEdges;
            })
        };

        const handleTest = workflowId && !isSubscriptionLoading ? () => {
            if (!hasActiveSubscription) {
                setUpgradeModalOpen(true);
                return;
            }
            setTestDialogOpen(true);
        } : undefined;

        return (
            <>
                {upgradeModal}
                {workflowId && (
                    <TestNodeDialog
                        open={testDialogOpen}
                        onOpenChange={setTestDialogOpen}
                        workflowId={workflowId}
                        nodeId={id}
                        nodeData={nodeData}
                        nodeName={name}
                    />
                )}
                <WorkflowNode
                    name={name}
                    description={description}
                    onDelete={handleDelete}
                    onSettings={onSettings}
                    onTest={handleTest}
                    data-onboarding={dataOnboarding}
                >
                    <NodeStatusIndicator
                        status={status}
                        variant="border"
                    >
                        <BaseNode onDoubleClick={onDoubleClick} status={status}>
                            <BaseNodeContent>
                                {typeof Icon === "string" ? (
                                    <Image src={Icon} alt={name} width={16} height={16} className={getLogoClassName(Icon)}/>
                                ) : (
                                    <Icon className="size-4 text-muted-foreground" />
                                )}
                                {children}
                                <BaseHandle 
                                    id="target-1"
                                    type="target"
                                    position={Position.Left}
                                    data-onboarding={dataOnboarding ? `${dataOnboarding}-target-handle` : undefined}
                                />
                                <BaseHandle 
                                    id="source-1"
                                    type="source"
                                    position={Position.Right}
                                    data-onboarding={dataOnboarding ? `${dataOnboarding}-source-handle` : undefined}
                                />
                            </BaseNodeContent>
                        </BaseNode>
                    </NodeStatusIndicator>
                </WorkflowNode>
            </>
        )
    },
);

BaseExecutionNode.displayName = "BaseExecutionNode"