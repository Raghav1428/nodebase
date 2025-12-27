import { createMCPClient, MCPClient } from '@ai-sdk/mcp';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface McpToolsConfig {
    transportType: 'sse' | 'stdio' | 'http';
    serverUrl?: string;
    command?: string;
    args?: string;
}

/**
 * Creates an MCP client based on the transport configuration.
 * Supports SSE, HTTP, and Stdio transports.
 */
export async function createMcpToolsClient(config: McpToolsConfig): Promise<MCPClient> {
    const { transportType, serverUrl, command, args } = config;

    if (transportType === 'sse' && serverUrl) {
        // SSE transport for remote servers
        const client = await createMCPClient({
            transport: {
                type: 'sse',
                url: serverUrl,
            },
        });
        return client;
    }

    if (transportType === 'http' && serverUrl) {
        // HTTP transport (recommended for production)
        const client = await createMCPClient({
            transport: {
                type: 'http',
                url: serverUrl,
            },
        });
        return client;
    }

    if (transportType === 'stdio' && command) {
        // Stdio transport for local MCP servers
        const argsArray = args ? args.split(' ').filter(a => a.trim()) : [];
        const client = await createMCPClient({
            transport: new StdioClientTransport({
                command,
                args: argsArray,
            }),
        });
        return client;
    }

    throw new Error(`Invalid MCP transport configuration: ${transportType}`);
}

/**
 * Gets MCP tools from a configuration.
 * Returns the tools in AI SDK compatible format for use with generateText.
 */
export async function getMcpToolsFromConfig(config: McpToolsConfig): Promise<{
    client: MCPClient;
    tools: Record<string, unknown>;
}> {
    const client = await createMcpToolsClient(config);

    let tools: Record<string, unknown>;
    try {
        tools = await client.tools();
    } catch (error) {
        await client.close();
        throw error;
    }

    return { client, tools };
}

/**
 * Creates MCP tools for use with the AI Agent.
 * This is a convenience function that handles client lifecycle.
 */
export async function createMcpToolsForAgent(config: McpToolsConfig): Promise<{
    tools: Record<string, unknown>;
    cleanup: () => Promise<void>;
}> {
    const { client, tools } = await getMcpToolsFromConfig(config);

    return {
        tools,
        cleanup: async () => {
            await client.close();
        },
    };
}
