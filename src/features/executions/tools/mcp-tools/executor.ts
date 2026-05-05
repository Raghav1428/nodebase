import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars";
import { mcpToolsChannel } from "@/inngest/channels/mcp-tools";
import { getMcpToolSchemas, executeMcpTool, type McpToolsConfig } from "./native-mcp-tools";

Handlebars.registerHelper("json", (context) => {
    const jsonString = JSON.stringify(context);
    const safeString = new Handlebars.SafeString(jsonString);
    return safeString;
});

export type McpToolsData = {
    serverUrl?: string;
    transportType?: "sse" | "stdio" | "http";
    command?: string;
    args?: string;
}

/**
 * Converts McpToolsData to McpToolsConfig.
 * Validates transport-specific required fields before building the config.
 */
export function getMcpConfigFromNodeData(data: McpToolsData): McpToolsConfig {
    const transportType = data.transportType || "sse";

    // Validate transport-specific required fields
    if (transportType === "stdio") {
        if (!data.command) {
            throw new Error(
                `MCP Tools: 'command' is required for stdio transport. Please specify the command to execute.`
            );
        }
    } else if (transportType === "sse" || transportType === "http") {
        if (!data.serverUrl) {
            throw new Error(
                `MCP Tools: 'serverUrl' is required for ${transportType} transport. Please specify the server URL.`
            );
        }
    }

    return {
        transportType,
        serverUrl: data.serverUrl,
        command: data.command,
        args: data.args,
    };
}

/**
 * MCP Tools Executor
 * 
 * When called by AI Agent (_isAgentToolsRequest = true):
 * - Publishes loading/success status
 * - Returns the MCP config for the chat model to use
 * 
 * When workflow executor tries to run it independently:
 * - Should not happen (MCP Tools must be connected to AI Agent)
 */
export const mcpToolsExecutor: NodeExecutor<McpToolsData> = async ({ data, nodeId, context, step, publish }) => {
    const mcpMode = context._mcpMode as 'getSchemas' | 'executeTool' | undefined;

    if (!mcpMode) {
        // MCP Tools should only be executed through AI Agent
        return context;
    }

    // Called by AI Agent - publish loading status
    await step.run(`publish-mcp-loading-${nodeId}`, async () => {
        await publish(
            mcpToolsChannel().status({
                nodeId,
                status: "loading",
            }),
        );
    });

    try {
        const mcpConfig = getMcpConfigFromNodeData(data);
        
        let resultContext = { ...context };

        if (mcpMode === 'getSchemas') {
            const schemasResult = await getMcpToolSchemas(mcpConfig);
            resultContext._mcpToolSchemas = schemasResult.tools;
            resultContext._mcpToolNames = schemasResult.toolNames;
            resultContext._mcpCleanup = schemasResult.cleanup;
        } else if (mcpMode === 'executeTool') {
            const toolName = context._mcpToolName as string;
            const toolArgs = context._mcpToolArgs as Record<string, unknown>;
            if (!toolName) {
                 throw new Error("Missing _mcpToolName in context for executeTool mode");
            }
            const toolResultString = await executeMcpTool(mcpConfig, toolName, toolArgs);
            resultContext._mcpToolResult = toolResultString;
        }

        // Publish success status
        await step.run(`publish-mcp-success-${nodeId}`, async () => {
            await publish(
                mcpToolsChannel().status({
                    nodeId,
                    status: "success",
                }),
            );
        });

        return resultContext;

    } catch (error) {
        await step.run(`publish-mcp-error-exec-${nodeId}`, async () => {
            await publish(
                mcpToolsChannel().status({
                    nodeId,
                    status: "error",
                }),
            );
        });

        throw new NonRetriableError("MCP Tools Node: Failed to configure tools", {
            cause: error,
        });
    }
};
