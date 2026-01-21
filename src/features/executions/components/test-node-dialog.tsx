"use client";

import { useState, useMemo, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useExecuteNode } from "../hooks/use-execute-node";
import { PlayIcon, Loader2Icon, AlertCircleIcon, CheckCircleIcon, CopyIcon, CheckIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TestNodeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workflowId: string;
    nodeId: string;
    nodeData: Record<string, unknown>;
    nodeName: string;
}

/**
 * Extracts Handlebars-style variable names from node data
 * Matches patterns like {{variable}}, {{trigger.data.name}}, etc.
 */
function extractVariables(data: Record<string, unknown>): string[] {
    const variables = new Set<string>();
    const regex = /\{\{([^}]+)\}\}/g;

    function searchValue(value: unknown) {
        if (typeof value === "string") {
            regex.lastIndex = 0;
            let match;
            while ((match = regex.exec(value)) !== null) {
                // Get the variable name, removing 'json ' prefix if present
                let varName = match[1].trim();
                if (varName.startsWith("json ")) {
                    varName = varName.substring(5);
                }
                variables.add(varName);
            }
        } else if (typeof value === "object" && value !== null) {
            Object.values(value).forEach(searchValue);
        }
    }

    searchValue(data);
    return Array.from(variables);
}

/**
 * Builds nested context object from dot-notation variable paths
 * e.g., "trigger.data.name" -> { trigger: { data: { name: value } } }
 */
function buildContextFromVariables(
    variables: string[],
    values: Record<string, string>
): Record<string, unknown> {
    const context: Record<string, unknown> = {};

    for (const varPath of variables) {
        const value = values[varPath] || "";
        const parts = varPath.split(".");

        let current: Record<string, unknown> = context;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]] || typeof current[parts[i]] !== "object") {
                current[parts[i]] = {};
            }
            current = current[parts[i]] as Record<string, unknown>;
        }
        current[parts[parts.length - 1]] = value;
    }

    return context;
}

/**
 * Formats output for display, truncating if too long
 */
function formatOutput(output: unknown, maxLength: number = 500): string {
    if (output === undefined || output === null) {
        return "No output";
    }
    
    let str: string;
    if (typeof output === "string") {
        str = output;
    } else {
        try {
            str = JSON.stringify(output, null, 2);
        } catch {
            str = String(output);
        }
    }
    
    if (str.length > maxLength) {
        return str.substring(0, maxLength) + "...";
    }
    return str;
}

export const TestNodeDialog = ({
    open,
    onOpenChange,
    workflowId,
    nodeId,
    nodeData,
    nodeName,
}: TestNodeDialogProps) => {
    const executeNode = useExecuteNode();
    const [variableValues, setVariableValues] = useState<Record<string, string>>({});
    const [copied, setCopied] = useState(false);
    
    const [executionResult, setExecutionResult] = useState<{
        status: "idle" | "running" | "success" | "error";
        output?: string;
        error?: string;
    }>({ status: "idle" });

    // Extract variables from node data
    const variables = useMemo(() => extractVariables(nodeData), [nodeData]);

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setExecutionResult({ status: "idle" });
            setCopied(false);
            // Initialize empty values for each variable
            const initialValues: Record<string, string> = {};
            variables.forEach((v) => {
                initialValues[v] = "";
            });
            setVariableValues(initialValues);
        }
    }, [open, variables]);

    const handleRunTest = () => {
        const mockContext = buildContextFromVariables(variables, variableValues);
        setExecutionResult({ status: "running" });
        setCopied(false);

        executeNode.mutate(
            { workflowId, nodeId, mockContext },
            {
                onSuccess: (data) => {
                    const output = data.output;
                    setExecutionResult({
                        status: "success",
                        output: formatOutput(output),
                    });
                },
                onError: (error) => {
                    setExecutionResult({
                        status: "error",
                        error: error.message,
                    });
                },
            }
        );
    };

    const handleVariableChange = (varName: string, value: string) => {
        setVariableValues((prev) => ({ ...prev, [varName]: value }));
    };

    const handleCopyOutput = async () => {
        if (executionResult.output) {
            try {
                await navigator.clipboard.writeText(executionResult.output);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch {
                // Clipboard access denied or not supported
                console.error("Failed to copy to clipboard");
            }
        }
    };
    const isRunning = executionResult.status === "running" || executeNode.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PlayIcon className="size-4" />
                        Test Node: {nodeName}
                    </DialogTitle>
                    <DialogDescription>
                        {variables.length > 0
                            ? "Enter sample values for the template variables used in this node."
                            : "This node has no template variables. Click Run to test with empty context."}
                    </DialogDescription>
                </DialogHeader>

                {variables.length > 0 && (
                    <ScrollArea className="max-h-[200px] pr-4">
                        <div className="space-y-4">
                            {variables.map((varName) => (
                                <div key={varName} className="space-y-2">
                                    <Label htmlFor={varName} className="font-mono text-sm">
                                        {`{{${varName}}}`}
                                    </Label>
                                    <Input
                                        id={varName}
                                        placeholder={`Enter value for ${varName}`}
                                        value={variableValues[varName] || ""}
                                        onChange={(e) => handleVariableChange(varName, e.target.value)}
                                        disabled={isRunning}
                                    />
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}

                {/* Result Display */}
                {executionResult.status !== "idle" && (
                    <div
                        className={`mt-6 rounded-lg border shadow-sm ${
                            executionResult.status === "success"
                                ? "bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-800"
                                : executionResult.status === "error"
                                ? "bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-800"
                                : "bg-muted/30 border-border"
                        }`}
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-inherit">
                            <div className="flex items-center gap-2.5 text-sm font-semibold">
                                {executionResult.status === "running" && (
                                    <>
                                        <Loader2Icon className="size-4 animate-spin text-blue-600" />
                                        <span className="text-muted-foreground">Running...</span>
                                    </>
                                )}
                                {executionResult.status === "success" && (
                                    <>
                                        <CheckCircleIcon className="size-4 text-green-600 dark:text-green-400" />
                                        <span className="text-green-700 dark:text-green-300">Success</span>
                                    </>
                                )}
                                {executionResult.status === "error" && (
                                    <>
                                        <AlertCircleIcon className="size-4 text-red-600 dark:text-red-400" />
                                        <span className="text-red-700 dark:text-red-300">Error</span>
                                    </>
                                )}
                            </div>
                            {executionResult.status === "success" && executionResult.output && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCopyOutput}
                                    className="h-8 px-2.5 hover:bg-black/5 dark:hover:bg-white/5"
                                >
                                    {copied ? (
                                        <CheckIcon className="size-4 text-green-600" />
                                    ) : (
                                        <CopyIcon className="size-4 text-muted-foreground" />
                                    )}
                                </Button>
                            )}
                        </div>
                        {(executionResult.output || executionResult.error) && (
                            <ScrollArea className="h-[300px] w-full rounded-b-lg bg-white/50 dark:bg-black/20">
                                <pre className="p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words">
                                    {executionResult.status === "error"
                                        ? executionResult.error
                                        : executionResult.output}
                                </pre>
                            </ScrollArea>
                        )}
                    </div>
                )}

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                    <Button onClick={handleRunTest} disabled={isRunning || variables.some(v => !variableValues[v]?.trim())}>
                        {isRunning ? (
                            <>
                                <Loader2Icon className="size-4 animate-spin mr-2" />
                                Running...
                            </>
                        ) : (
                            <>
                                <PlayIcon className="size-4 mr-2" />
                                Run Test
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
