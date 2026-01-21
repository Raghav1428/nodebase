"use client";

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, type Node, type Edge, type NodeChange, type EdgeChange, type Connection, Background, Controls, MiniMap, useReactFlow, Panel, type ColorMode } from '@xyflow/react';
import { ErrorView } from "@/components/entity-components";
import { ChevronRight } from "lucide-react";
import { useSuspenseWorkflow } from "@/features/workflows/hooks/use-workflows";

import '@xyflow/react/dist/style.css';
import { nodeComponents } from '@/config/node-components';
import { AddNodeButton } from './add-node-button';
import { useSetAtom } from 'jotai';
import { editorAtom } from '../store/atoms';
import { DATABASE, NodeType } from '@/generated/prisma';
import { ExecuteWorkflowButton } from './execute-workflow-button';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { Skeleton } from "@/components/ui/skeleton";

const DATABASE_NODE_TYPES = [NodeType.POSTGRES, NodeType.MONGODB];

export const EditorSkeleton = () => {
    return (
        <div className="flex flex-col h-full w-full">
            {/* Context Header Skeleton */}
            <div className="flex items-center justify-between px-4 border-b h-14 bg-background">
                <div className="flex items-center gap-2">
                    <Skeleton className="size-8 rounded-md"/>
                    <div className="flex items-center gap-2 ml-2">
                        <Skeleton className="h-4 w-16"/>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                        <Skeleton className="h-4 w-32"/>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-20"/>
                </div>
            </div>

            {/* Main Area Skeleton */}
            <div className="flex-1 relative bg-muted/5">
                 {/* Top Right Panel - Add Node Button */}
                 <div className="absolute top-4 right-4 z-10">
                    <Skeleton className="h-9 w-10" />
                 </div>
    
                 {/* Bottom Left - Controls */}
                 <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1">
                    <Skeleton className="size-6" />
                    <Skeleton className="size-6" />
                    <Skeleton className="size-6" />
                    <Skeleton className="size-6" />
                 </div>
    
                 {/* Bottom Right - MiniMap */}
                 <div className="absolute bottom-4 right-4 z-10">
                    <Skeleton className="h-[100px] w-[150px]" />
                 </div>
    
                 {/* Bottom Center - Execute Button */}
                 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                    <Skeleton className="h-10 w-32" />
                 </div>
                 
                 {/* Center - View Mode Selector Mock */}
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10]">
                    <Skeleton className="h-9 w-44 border shadow-sm" />
                 </div>
            </div>
        </div>
    )
}

export const EditorLoading = () => {
    return <EditorSkeleton />
};

export const EditorError = () => {
    return <ErrorView message="Error loading editor..." />
};

export const Editor = ({ workflowId }: { workflowId: string }) => {
    const { data: workflow } = useSuspenseWorkflow(workflowId);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    const setEditor = useSetAtom(editorAtom);

    const [nodes, setNodes] = useState<Node[]>(workflow.nodes);
    const [edges, setEdges] = useState<Edge[]>(workflow.edges);
    
    useEffect(() => {
        setMounted(true);
    }, []);

    const onNodesChange = useCallback(
        (changes : NodeChange[]) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
        [],
    );
    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
        [],
    );
    
    // Validate connection: only allow 1 database node per AI Agent
    const isValidConnection = useCallback((connection: Edge | Connection) => {
        const targetNode = nodes.find(n => n.id === connection.target);
        const sourceNode = nodes.find(n => n.id === connection.source);
        const targetHandle = 'targetHandle' in connection ? connection.targetHandle : null;
        
        if (
            targetNode?.type === NodeType.AI_AGENT &&
            targetHandle === 'database' &&
            sourceNode?.type &&
            DATABASE_NODE_TYPES.includes(sourceNode.type as DATABASE)
        ) {
            // Check if there's already a database connected to this AI Agent
            // Also verify the source node still exists (might be deleted but edge not cleaned up yet)
            const existingDatabaseConnection = edges.find(edge => 
                edge.target === connection.target && 
                edge.targetHandle === 'database' &&
                nodes.some(n => n.id === edge.source) 
            );
            
            if (existingDatabaseConnection) {
                return false;
            }
        }
        
        return true;
    }, [nodes, edges]);
    
    const onConnect = useCallback(
        (params: Connection) => {
            if (isValidConnection(params)) {
                setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot));
            } else {
                toast.error("Only 1 memory/database node can be connected per AI Agent", {
                    id: "database-connection-limit",
                });
            }
        },
        [isValidConnection],
    );

    const hasManualTrigger = useMemo(() =>{
        return nodes.some(node => node.type === NodeType.MANUAL_TRIGGER || node.type === NodeType.SCHEDULED_TRIGGER);
    }, [nodes]);

    return (
        <div className='size-full'>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeComponents}
                fitView
                onInit={setEditor}
                colorMode={mounted ? (resolvedTheme as ColorMode) || 'light' : 'light'}
                proOptions={{
                    hideAttribution: true
                }}
                snapGrid={[2,2]}
                snapToGrid
            >
                <Background/>
                <Controls />
                <MiniMap />
                <Panel position="top-right">
                    <AddNodeButton />
                </Panel>
                {hasManualTrigger && (
                    <Panel position="bottom-center" data-onboarding="execute-panel" className="p-2">
                        <ExecuteWorkflowButton workflowId={workflowId} />
                    </Panel>
                )}
            </ReactFlow>
        </div>
    );
};