/**
 * Helper to create MCP tools for use with AI SDK generateText.
 * 
 * This helper uses the raw @modelcontextprotocol/sdk to get full tool definitions
 * including inputSchema, then builds proper AI SDK tools with Zod parameters.
 * 
 * Supports both stdio and SSE transports.
 */

import { z, ZodTypeAny } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { parseArgs } from './parse-args';

// Export the McpToolsConfig type for consumers
export interface McpToolsConfig {
    transportType: 'sse' | 'stdio' | 'http';
    serverUrl?: string;
    command?: string;
    args?: string;
}

export interface NativeMcpToolsResult {
    tools: Record<string, unknown>;
    toolCount: number;
    toolNames: string[];
    cleanup: () => Promise<void>;
}

/**
 * Converts a JSON Schema property type to a Zod schema.
 * Handles common JSON Schema types and nested objects.
 */
function jsonSchemaToZod(schema: Record<string, unknown>): ZodTypeAny {
    const type = schema.type as string | undefined;
    const description = schema.description as string | undefined;

    let zodSchema: ZodTypeAny;

    switch (type) {
        case 'string':
            zodSchema = z.string();
            break;
        case 'number':
            zodSchema = z.number();
            break;
        case 'integer':
            zodSchema = z.number().int();
            break;
        case 'boolean':
            zodSchema = z.boolean();
            break;
        case 'array': {
            const items = schema.items as Record<string, unknown> | undefined;
            if (items) {
                zodSchema = z.array(jsonSchemaToZod(items));
            } else {
                zodSchema = z.array(z.unknown());
            }
            break;
        }
        case 'object': {
            const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
            const required = schema.required as string[] | undefined;

            if (properties) {
                const shape: Record<string, ZodTypeAny> = {};
                for (const [key, propSchema] of Object.entries(properties)) {
                    let propZod = jsonSchemaToZod(propSchema);
                    if (!required || !required.includes(key)) {
                        propZod = propZod.optional();
                    }
                    shape[key] = propZod;
                }
                zodSchema = z.object(shape);
            } else {
                zodSchema = z.record(z.string(), z.unknown());
            }
            break;
        }
        default:
            zodSchema = z.unknown();
    }

    // Add description if available
    if (description) {
        zodSchema = zodSchema.describe(description);
    }

    return zodSchema;
}

/**
 * Converts an MCP tool's inputSchema (JSON Schema) to a Zod object schema.
 */
function inputSchemaToZodObject(inputSchema: unknown): z.ZodObject<Record<string, ZodTypeAny>> {
    if (!inputSchema || typeof inputSchema !== 'object') {
        return z.object({});
    }

    const schema = inputSchema as Record<string, unknown>;
    const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
    const required = schema.required as string[] | undefined;

    if (!properties) {
        return z.object({});
    }

    const shape: Record<string, ZodTypeAny> = {};
    for (const [key, propSchema] of Object.entries(properties)) {
        let propZod = jsonSchemaToZod(propSchema);
        if (!required || !required.includes(key)) {
            propZod = propZod.optional();
        }
        shape[key] = propZod;
    }

    return z.object(shape);
}

/**
 * Builds AI SDK tools from MCP tool definitions.
 * Shared helper for both stdio and SSE transports.
 */
function buildToolsFromMcpList(
    listResult: { tools: Array<{ name: string; description?: string; inputSchema?: unknown }> },
    client: Client
): { nativeTools: Record<string, unknown>; toolNames: string[] } {
    const toolNames = listResult.tools.map(t => t.name);
    const nativeTools: Record<string, unknown> = {};

    for (const tool of listResult.tools) {
        const zodParameters = inputSchemaToZodObject(tool.inputSchema);

        nativeTools[tool.name] = {
            description: tool.description || `MCP tool: ${tool.name}`,
            inputSchema: zodParameters,
            execute: async (toolArgs: Record<string, unknown>) => {
                const result = await client.callTool({
                    name: tool.name,
                    arguments: toolArgs,
                });

                // Extract text content from MCP result format
                if (result.content && Array.isArray(result.content)) {
                    const textContent = result.content
                        .filter((c: { type: string }) => c.type === 'text')
                        .map((c: { type: string; text?: string }) => c.text || '')
                        .join('\n');
                    return textContent || JSON.stringify(result);
                }

                return JSON.stringify(result);
            },
        };
    }

    return { nativeTools, toolNames };
}

/**
 * Creates native AI SDK tools from an MCP server.
 * 
 * Uses the raw @modelcontextprotocol/sdk Client to:
 * 1. Connect to the MCP server via stdio or SSE
 * 2. List tools with full inputSchema
 * 3. Build proper AI SDK tools with Zod parameters and execute functions
 */
export async function createNativeMcpTools(config: McpToolsConfig): Promise<NativeMcpToolsResult> {
    const { transportType, serverUrl, command, args } = config;

    // Validate configuration BEFORE creating client to avoid resource leaks
    if (transportType === 'stdio') {
        if (!command) {
            throw new Error(`Invalid MCP transport configuration: stdio transport requires 'command'.`);
        }
    } else if (transportType === 'sse' || transportType === 'http') {
        if (!serverUrl) {
            throw new Error(`Invalid MCP transport configuration: ${transportType} transport requires 'serverUrl'.`);
        }
        // Validate URL parsing before creating client
        try {
            new URL(serverUrl);
        } catch (urlError) {
            throw new Error(`Invalid MCP server URL: ${serverUrl}. ${urlError instanceof Error ? urlError.message : String(urlError)}`);
        }
    } else {
        throw new Error(`Invalid MCP transport type: ${transportType}. Supported types: 'stdio', 'sse', 'http'.`);
    }

    // Create MCP client after validation passes
    const client = new Client({
        name: 'nodebase-mcp-client',
        version: '1.0.0',
    });

    try {
        if (transportType === 'stdio') {
            const argsArray = parseArgs(args);
            const transport = new StdioClientTransport({ command: command!, args: argsArray });

            await client.connect(transport);

            const listResult = await client.listTools();
            const { nativeTools, toolNames } = buildToolsFromMcpList(listResult, client);

            return {
                tools: nativeTools,
                toolCount: toolNames.length,
                toolNames: toolNames,
                cleanup: async () => {
                    await client.close();
                },
            };
        } else {
            // SSE or HTTP transport
            const transport = new SSEClientTransport(new URL(serverUrl!));

            await client.connect(transport);

            const listResult = await client.listTools();
            const { nativeTools, toolNames } = buildToolsFromMcpList(listResult, client);

            return {
                tools: nativeTools,
                toolCount: toolNames.length,
                toolNames: toolNames,
                cleanup: async () => {
                    await client.close();
                },
            };
        }
    } catch (error) {
        // Ensure client is closed on any error during connection or tool listing
        try {
            await client.close();
        } catch {
            // Ignore close errors during cleanup
        }
        throw error;
    }
}
