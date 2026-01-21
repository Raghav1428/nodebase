"use client";

import { NodeToolbar, Position } from "@xyflow/react";
import { PlayIcon, SettingsIcon, TrashIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface WorkflowNodeProps {
    children: ReactNode;
    showToolbar?: boolean;
    onDelete?: () => void;
    onSettings?: () => void;
    onTest?: () => void;
    name?: string;
    description?: string;
};

export function WorkflowNode({
    children,
    showToolbar = true,
    onDelete,
    onSettings,
    onTest,
    name,
    description
}: WorkflowNodeProps) {
    return (
        <>
            {showToolbar && (
                <NodeToolbar>
                    {onSettings && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" onClick={onSettings} data-onboarding="node-settings-trigger">
                                    <SettingsIcon className="size-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Node Settings</TooltipContent>
                        </Tooltip>
                    )}
                    {onTest && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" onClick={onTest}>
                                    <PlayIcon className="size-4 text-green-500" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Test Node</TooltipContent>
                        </Tooltip>
                    )}
                    {onDelete && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" onClick={onDelete}>
                                    <TrashIcon className="size-4 text-red-500" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete Node</TooltipContent>
                        </Tooltip>
                    )}                
                </NodeToolbar>
            )}
            {children}
            {name && (
                <NodeToolbar position={Position.Bottom} isVisible className="max-w-[200px] text-center">
                    <p className="font-medium">{name}</p>
                    {description && (
                        <p className="text-muted-foreground truncate text-sm">{description}</p>
                    )}
                </NodeToolbar>
            )}
        </>
    )
}