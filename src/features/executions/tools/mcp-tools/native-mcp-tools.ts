/**
 * Helper to create MCP tools for use with AI SDK generateText.
 * 
 * This helper uses the raw @modelcontextprotocol/sdk to get full tool definitions
 * including inputSchema, then builds proper AI SDK tools with Zod parameters.
 * Supports both stdio and SSE/HTTP transports.
 */

import { z, ZodTypeAny } from 'zod';
import { jsonSchema } from 'ai';
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

export interface McpToolSchemasResult {
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
 * Uses AI SDK's jsonSchema() to pass raw JSON Schema directly,
 * avoiding the lossy JSON Schema → Zod → JSON Schema round-trip.
 */
function buildToolsFromMcpList(
    listResult: { tools: Array<{ name: string; description?: string; inputSchema?: unknown }> },
): { nativeTools: Record<string, unknown>; toolNames: string[] } {
    const toolNames = listResult.tools.map(t => t.name);
    const nativeTools: Record<string, unknown> = {};

    for (const mcpTool of listResult.tools) {
        // Ensure the inputSchema has type: "object" at the top level
        const rawSchema = (mcpTool.inputSchema as Record<string, unknown>) || { type: 'object', properties: {} };
        if (!rawSchema.type) {
            rawSchema.type = 'object';
        }

        const schema = jsonSchema(rawSchema);
        nativeTools[mcpTool.name] = {
            type: 'function',
            description: mcpTool.description || `MCP tool: ${mcpTool.name}`,
            parameters: schema,
            inputSchema: schema, // CRITICAL: Required for AI SDK's internal anthropic parser (asSchema)
        };
    }

    return { nativeTools, toolNames };
}

/**
 * Connects to the MCP server securely and fetches available tools.
 * Returns only tool schemas (without executing them) so the AI Agent can pass them to the LLM.
 */
export async function getMcpToolSchemas(config: McpToolsConfig): Promise<McpToolSchemasResult> {
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
            const { nativeTools, toolNames } = buildToolsFromMcpList(listResult);

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
            const { nativeTools, toolNames } = buildToolsFromMcpList(listResult);

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

/**
 * Connects to the MCP server securely and executes a single specified tool.
 * Evaluates the result and returns it as a string format (ideal for feeding back into the AI agent).
 */
export async function executeMcpTool(config: McpToolsConfig, toolName: string, toolArgs: Record<string, unknown>): Promise<string> {
    const { transportType, serverUrl, command, args } = config;

    const client = new Client({
        name: 'nodebase-mcp-executor',
        version: '1.0.0',
    });

    try {
        if (transportType === 'stdio') {
            const argsArray = parseArgs(args);
            const transport = new StdioClientTransport({ command: command!, args: argsArray });
            await client.connect(transport);
        } else {
            const transport = new SSEClientTransport(new URL(serverUrl!));
            await client.connect(transport);
        }

        const result = await client.callTool({
            name: toolName,
            arguments: toolArgs,
        });

        await client.close();

        // Extract text content from MCP result format
        if (result.content && Array.isArray(result.content)) {
            const textContent = result.content
                .filter((c: { type: string }) => c.type === 'text')
                .map((c: { type: string; text?: string }) => c.text || '')
                .join('\n');
            return textContent || JSON.stringify(result);
        }

        return JSON.stringify(result);
    } catch (error) {
        try { await client.close(); } catch { }
        throw error;
    }
}
