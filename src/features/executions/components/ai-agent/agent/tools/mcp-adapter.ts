import type { ConnectedNode, ToolDefinition, OrchestratorDeps } from "../types";
import { DEFAULT_TOOL_METADATA } from "../types";
import { getMcpToolSchemas, executeMcpTool } from "@/features/executions/tools/mcp-tools/native-mcp-tools";
import { getMcpConfigFromNodeData } from "@/features/executions/tools/mcp-tools/executor";

/**
 * Result of loading MCP tools — includes tool definitions and cleanup function.
 */
export interface McpLoadResult {
  tools: ToolDefinition[];
  toolNames: string[];
  cleanup: () => Promise<void>;
  transportType: string;
}

/**
 * Loads MCP tool schemas from the connected MCP server and converts them
 * to ToolDefinition[] for use in the tool registry.
 *
 * Each MCP tool is flagged as non-idempotent by default (safe assumption
 * since we can't know if an MCP tool has side effects).
 */
export async function loadMcpTools(
  toolsNode: ConnectedNode,
  deps: OrchestratorDeps,
): Promise<McpLoadResult> {
  const mcpConfig = getMcpConfigFromNodeData(
    toolsNode.data as {
      serverUrl?: string;
      transportType?: "sse" | "stdio" | "http";
      command?: string;
      args?: string;
    },
  );

  const schemasResult = await getMcpToolSchemas(mcpConfig);

  // Convert MCP tool schemas to ToolDefinition[]
  const tools: ToolDefinition[] = [];
  const { z } = await import("zod");

  for (const [toolName, toolSchema] of Object.entries(schemasResult.tools)) {
    const schema = toolSchema as {
      description?: string;
      parameters?: unknown;
      inputSchema?: unknown;
    };

    tools.push({
      name: toolName,
      description: schema.description || `MCP tool: ${toolName}`,
      // MCP tools accept arbitrary JSON args — use permissive schema
      parameters: z.record(z.string(), z.unknown()),
      metadata: {
        ...DEFAULT_TOOL_METADATA,
        idempotent: false, // MCP tools assumed non-idempotent
        timeoutMs: 30_000,
      },
      execute: async (args: Record<string, unknown>): Promise<string> => {
        return executeMcpTool(mcpConfig, toolName, args);
      },
    });
  }

  return {
    tools,
    toolNames: schemasResult.toolNames,
    cleanup: schemasResult.cleanup,
    transportType: mcpConfig.transportType,
  };
}
