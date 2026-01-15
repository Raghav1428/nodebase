"use client";

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, type Node, type Edge, type NodeChange, type EdgeChange, type Connection, Background, Controls, MiniMap, useReactFlow, Panel, type ColorMode } from '@xyflow/react';
import { ErrorView, LoadingView } from "@/components/entity-components";
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

const DATABASE_NODE_TYPES = [NodeType.POSTGRES, NodeType.MONGODB];

export const EditorLoading = () => {
    return <LoadingView message="Loading editor..." />
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
                    <Panel position="bottom-center">
                        <ExecuteWorkflowButton workflowId={workflowId} />
                    </Panel>
                )}
            </ReactFlow>
        </div>
    );
};