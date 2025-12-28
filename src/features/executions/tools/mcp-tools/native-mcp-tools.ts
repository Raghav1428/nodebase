/**
 * Helper to create MCP tools for use with AI SDK generateText.
 * 
 * This helper uses the raw @modelcontextprotocol/sdk to get full tool definitions
 * including inputSchema, then builds proper AI SDK tools with Zod parameters.
 */

import { z, ZodTypeAny } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
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
 * Creates native AI SDK tools from an MCP server.
 * 
 * Uses the raw @modelcontextprotocol/sdk Client to:
 * 1. Connect to the MCP server
 * 2. List tools with full inputSchema
 * 3. Build proper AI SDK tools with Zod parameters and execute functions
 */
export async function createNativeMcpTools(config: McpToolsConfig): Promise<NativeMcpToolsResult> {
    const { transportType, serverUrl, command, args } = config;

    if (transportType === 'stdio' && command) {
        const argsArray = parseArgs(args);
        const transport = new StdioClientTransport({ command, args: argsArray });

        const client = new Client({
            name: 'nodebase-mcp-client',
            version: '1.0.0',
        });

        await client.connect(transport);

        try {
            const listResult = await client.listTools();
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

            return {
                tools: nativeTools,
                toolCount: toolNames.length,
                toolNames: toolNames,
                cleanup: async () => {
                    await client.close();
                },
            };
        } catch (error) {
            await client.close();
            throw error;
        }
    } else if ((transportType === 'sse' || transportType === 'http') && serverUrl) {
        throw new Error(`SSE/HTTP transport not yet implemented for native MCP tools. Use stdio transport instead.`);
    } else {
        throw new Error(`Invalid MCP transport configuration: ${transportType}`);
    }
}
