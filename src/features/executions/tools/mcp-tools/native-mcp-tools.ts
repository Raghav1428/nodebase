/**
 * Helper to create MCP tools for use with AI SDK generateText.
 * 
 * This helper dynamically wraps ALL tools discovered from the MCP server,
 * creating native AI SDK tool objects that delegate execution to the MCP server.
 */

import { z, ZodTypeAny } from 'zod';
import { createMCPClient, MCPClient } from '@ai-sdk/mcp';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { experimental_createMCPClient as createSSEMCPClient } from 'ai';

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
 * Converts an MCP tool's inputSchema to a Zod object schema.
 * Handles the case where the schema is wrapped in a `jsonSchema` property.
 */
function inputSchemaToZodObject(inputSchema: unknown): z.ZodObject<Record<string, ZodTypeAny>> {
    if (!inputSchema || typeof inputSchema !== 'object') {
        return z.object({});
    }

    // The MCP SDK wraps the actual JSON Schema in a `jsonSchema` property
    let schema = inputSchema as Record<string, unknown>;
    if (schema.jsonSchema && typeof schema.jsonSchema === 'object') {
        schema = schema.jsonSchema as Record<string, unknown>;
    }

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
 * Creates native AI SDK tools that wrap MCP tool execution.
 * Dynamically wraps ALL tools discovered from the MCP server.
 */
export async function createNativeMcpTools(config: McpToolsConfig): Promise<NativeMcpToolsResult> {
    const { transportType, serverUrl, command, args } = config;

    // Create transport based on config
    if (transportType === 'stdio' && command) {
        const argsArray = args ? args.split(' ').filter(a => a.trim()) : [];
        const transport = new StdioClientTransport({ command, args: argsArray });

        // Create MCP client
        const client: MCPClient = await createMCPClient({ transport });

        // Get ALL MCP tools dynamically
        const mcpTools = await client.tools();
        const toolNames = Object.keys(mcpTools);

        console.log(`[MCP Debug] Discovered ${toolNames.length} tools:`, toolNames);

        // Create native AI SDK tools for ALL discovered tools
        const nativeTools: Record<string, unknown> = {};

        for (const toolName of toolNames) {
            const mcpTool = mcpTools[toolName];

            console.log(`[MCP Debug] Tool '${toolName}' structure:`, {
                hasExecute: typeof (mcpTool as { execute?: unknown }).execute,
                keys: mcpTool ? Object.keys(mcpTool as object) : [],
            });

            // Validate tool has execute method
            if (!mcpTool || typeof (mcpTool as { execute?: unknown }).execute !== 'function') {
                console.warn(`MCP tool '${toolName}' is missing or does not have an execute method, skipping`);
                continue;
            }

            const mcpExecute = (mcpTool as unknown as { execute: (args: unknown) => Promise<unknown> }).execute;

            // Extract description and input schema from MCP tool
            const toolDescription = (mcpTool as { description?: string }).description || `MCP tool: ${toolName}`;
            const inputSchema = (mcpTool as { inputSchema?: unknown }).inputSchema;

            console.log(`[MCP Debug] Tool '${toolName}' inputSchema:`, JSON.stringify(inputSchema, null, 2));

            // Convert inputSchema to Zod parameters
            const zodParameters = inputSchemaToZodObject(inputSchema);

            // Debug: log the Zod schema shape
            console.log(`[MCP Debug] Tool '${toolName}' zodParameters shape:`, Object.keys(zodParameters.shape));

            // Create native tool wrapper
            nativeTools[toolName] = {
                description: toolDescription,
                parameters: zodParameters,
                execute: async (toolArgs: unknown) => {
                    try {
                        const result = await mcpExecute(toolArgs);
                        return result;
                    } catch (error) {
                        throw new Error(
                            `Failed to execute MCP tool '${toolName}': ${error instanceof Error ? error.message : String(error)}`
                        );
                    }
                },
            };
        }

        return {
            tools: nativeTools,
            toolCount: Object.keys(nativeTools).length,
            toolNames: Object.keys(nativeTools),
            cleanup: async () => {
                await client.close();
            },
        };
    } else if ((transportType === 'sse' || transportType === 'http') && serverUrl) {
        // Support for SSE/HTTP transport using experimental AI SDK client
        // Validate and map transport type - the experimental client primarily supports 'sse'
        // 'http' is mapped to 'sse' as they use similar URL-based connectivity
        const mappedTransportType = transportType === 'http' ? 'sse' : transportType;

        if (mappedTransportType !== 'sse') {
            throw new Error(`Unsupported transport type for URL-based MCP: ${transportType}. Expected 'sse' or 'http'.`);
        }

        try {
            const client = await createSSEMCPClient({
                transport: {
                    type: mappedTransportType,
                    url: serverUrl,
                },
            });

            // Get ALL MCP tools dynamically
            const mcpTools = await client.tools();
            const toolNames = Object.keys(mcpTools);

            // Create native AI SDK tools for ALL discovered tools
            const nativeTools: Record<string, unknown> = {};

            for (const toolName of toolNames) {
                const mcpTool = mcpTools[toolName];

                // Validate tool has execute method
                if (!mcpTool || typeof (mcpTool as { execute?: unknown }).execute !== 'function') {
                    console.warn(`MCP tool '${toolName}' is missing or does not have an execute method, skipping`);
                    continue;
                }

                const mcpExecute = (mcpTool as unknown as { execute: (args: unknown) => Promise<unknown> }).execute;

                // Extract description and input schema from MCP tool
                const toolDescription = (mcpTool as { description?: string }).description || `MCP tool: ${toolName}`;
                const inputSchema = (mcpTool as { inputSchema?: unknown }).inputSchema;

                // Convert inputSchema to Zod parameters
                const zodParameters = inputSchemaToZodObject(inputSchema);

                // Create native tool wrapper
                nativeTools[toolName] = {
                    description: toolDescription,
                    parameters: zodParameters,
                    execute: async (toolArgs: unknown) => {
                        const result = await mcpExecute(toolArgs);
                        return result;
                    },
                };
            }

            return {
                tools: nativeTools,
                toolCount: Object.keys(nativeTools).length,
                toolNames: Object.keys(nativeTools),
                cleanup: async () => {
                    await client.close();
                },
            };
        } catch (error) {
            throw new Error(`Failed to connect to MCP server at ${serverUrl}: ${error instanceof Error ? error.message : String(error)}`);
        }
    } else {
        throw new Error(`Invalid MCP transport configuration: ${transportType}`);
    }
}
