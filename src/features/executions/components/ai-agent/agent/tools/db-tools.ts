import { z } from "zod";
import type { ConnectedNode, ToolDefinition, OrchestratorDeps } from "../types";
import { DEFAULT_TOOL_METADATA } from "../types";

/**
 * Creates pre-defined database tool definitions for the AI Agent.
 *
 * These tools wrap the existing postgres/mongodb executors and provide
 * typed, Zod-validated interfaces for the LLM to interact with the database.
 *
 * Available tools:
 * - query_chat_history: Read conversation history (idempotent, safe to retry)
 * - save_note: Write a message to the database (non-idempotent, no retry)
 */
export function createDbTools(
  dbNode: ConnectedNode,
  config: { workflowId: string; agentNodeId: string },
  deps: OrchestratorDeps,
): ToolDefinition[] {
  const operationKey =
    dbNode.type === "POSTGRES" ? "_postgresOperation" : "_mongodbOperation";
  const resultKey =
    dbNode.type === "POSTGRES" ? "_postgresResult" : "_mongodbResult";

  const tools: ToolDefinition[] = [
    {
      name: "query_chat_history",
      description:
        "Query the conversation history from the database. Returns recent messages ordered by time.",
      parameters: z.object({
        limit: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum number of messages to retrieve (1-100, default 20)"),
      }),
      metadata: {
        ...DEFAULT_TOOL_METADATA,
        idempotent: true, // Read-only operation, safe to retry
        retryableErrors: ["ECONNREFUSED", "ETIMEDOUT", "connection timeout"],
        timeoutMs: 15_000,
        parallelExecution: true, // Read-only, safe for future parallel execution
      },
      execute: async (args: Record<string, unknown>): Promise<string> => {
        const parsed = z
          .object({ limit: z.number().min(1).max(100).optional() })
          .parse(args);

        const dbExecutor = deps.getExecutor(dbNode.type);
        const updatedContext = await dbExecutor({
          data: {
            ...dbNode.data,
            contextWindow: String(parsed.limit || 20),
          },
          nodeId: dbNode.id,
          userId: deps.userId,
          context: {
            ...deps.context,
            _workflowId: config.workflowId,
            _agentNodeId: config.agentNodeId,
            [operationKey]: "query",
          },
          step: deps.step,
          publish: deps.publish,
        });

        const result = updatedContext[resultKey] as Record<string, unknown>;
        const chatHistory = (result?.chatHistory as Array<{ role: string; content: string }>) || [];

        if (chatHistory.length === 0) {
          return "No conversation history found.";
        }

        return JSON.stringify(chatHistory, null, 2);
      },
    },

    {
      name: "save_note",
      description:
        "Save a note or message to the conversation database. Use this to persist important information.",
      parameters: z.object({
        content: z
          .string()
          .min(1)
          .describe("The message content to save"),
        role: z
          .enum(["user", "assistant"])
          .optional()
          .describe("The role of the message sender (default: assistant)"),
      }),
      metadata: {
        ...DEFAULT_TOOL_METADATA,
        idempotent: false, // Write operation, never retry
        timeoutMs: 15_000,
        parallelExecution: false,
      },
      execute: async (args: Record<string, unknown>): Promise<string> => {
        const parsed = z
          .object({
            content: z.string().min(1),
            role: z.enum(["user", "assistant"]).optional(),
          })
          .parse(args);

        const dbExecutor = deps.getExecutor(dbNode.type);
        await dbExecutor({
          data: dbNode.data,
          nodeId: dbNode.id,
          userId: deps.userId,
          context: {
            ...deps.context,
            _workflowId: config.workflowId,
            _agentNodeId: config.agentNodeId,
            [operationKey]: "save",
            _messageToSave: parsed.content,
            _messageRole: parsed.role || "assistant",
          },
          step: deps.step,
          publish: deps.publish,
        });

        return `Message saved successfully with role "${parsed.role || "assistant"}".`;
      },
    },
  ];

  return tools;
}
