import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars";
import { mcpToolsChannel } from "@/inngest/channels/mcp-tools";
import { createMcpToolsForAgent, type McpToolsConfig } from "./mcp-client";

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
 * Gets MCP tools from node data configuration.
 * Used by AI Agent to get tools for generateText.
 */
export async function getMcpToolsFromNodeData(data: McpToolsData): Promise<{
    tools: Record<string, unknown>;
    cleanup: () => Promise<void>;
}> {
    const config = getMcpConfigFromNodeData(data);
    return createMcpToolsForAgent(config);
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
    // Check if this is being called by the AI Agent
    const isAgentRequest = context._isAgentToolsRequest === true;

    if (!isAgentRequest) {
        // MCP Tools should only be executed through AI Agent
        // If running independently, just return without action
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
        // Get the MCP config
        const mcpConfig = getMcpConfigFromNodeData(data);

        // Publish success status
        await step.run(`publish-mcp-success-${nodeId}`, async () => {
            await publish(
                mcpToolsChannel().status({
                    nodeId,
                    status: "success",
                }),
            );
        });

        // Return the config for the AI Agent and chat model to use
        return {
            ...context,
            _mcpToolsConfig: mcpConfig,
        };

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
