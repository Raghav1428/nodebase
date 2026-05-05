import type { RawToolCall, ActionRequest, ToolMetadata, DEFAULT_TOOL_METADATA } from "../types";
import { ToolRegistry } from "../tools/registry";
import { createId } from "@paralleldrive/cuid2";

/**
 * Converts raw LLM tool calls into validated ActionRequests.
 *
 * For each tool call:
 * - If the tool is unknown: creates an invalid request with a clear error message
 * - If the tool exists: validates args against the tool's Zod schema
 * - Assigns a unique execution ID to each request
 *
 * Invalid requests are NOT filtered out — they are passed through to
 * execute-actions.ts which converts them to error observations so the
 * LLM can self-correct.
 */
export function createActionRequests(
  toolCalls: RawToolCall[],
  registry: ToolRegistry,
): ActionRequest[] {
  return toolCalls.map((call) => {
    const tool = registry.get(call.toolName);

    // Unknown tool — create invalid request
    if (!tool) {
      return {
        id: createId(),
        toolCallId: call.toolCallId,
        toolName: call.toolName,
        args: call.args,
        validated: false,
        validationError: `Unknown tool "${call.toolName}". Available tools: ${registry.getNames().join(", ") || "none"}`,
        toolMetadata: {
          idempotent: false,
          retryableErrors: [],
          timeoutMs: 0,
          parallelExecution: false,
        },
      };
    }

    // Validate arguments against the tool's Zod schema
    const parseResult = tool.parameters.safeParse(call.args);

    if (!parseResult.success) {
      const zodError =
        "issues" in parseResult.error
          ? (parseResult.error.issues as Array<{ path: (string | number)[]; message: string }>)
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; ")
          : String(parseResult.error);

      return {
        id: createId(),
        toolCallId: call.toolCallId,
        toolName: call.toolName,
        args: call.args,
        validated: false,
        validationError: `Invalid arguments for tool "${call.toolName}": ${zodError}`,
        toolMetadata: tool.metadata,
      };
    }

    return {
      id: createId(),
      toolCallId: call.toolCallId,
      toolName: call.toolName,
      args: parseResult.data as Record<string, unknown>,
      validated: true,
      toolMetadata: tool.metadata,
    };
  });
}
