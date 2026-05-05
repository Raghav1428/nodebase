import type { ActionRequest, ToolResult } from "../types";
import type { ToolRegistry } from "../tools/registry";

/**
 * Executes validated action requests sequentially.
 *
 * Retry policy (tool-aware):
 * - Non-idempotent tools (idempotent: false): NEVER retried. Errors returned as observations.
 * - Idempotent tools (idempotent: true): Retried once if the error message matches retryableErrors.
 *
 * Failed tools produce error observations (strings) rather than throwing,
 * so the LLM can see the failure and self-correct.
 */
export async function executeActions(
  requests: ActionRequest[],
  registry: ToolRegistry,
  options?: {
    onToolStart?: (toolName: string, args: Record<string, unknown>) => void;
    onToolEnd?: (result: ToolResult) => void;
  },
): Promise<ToolResult[]> {
  const results: ToolResult[] = [];

  // Sequential execution (future: parallel for read-only via parallelExecution flag)
  for (const request of requests) {
    const startTime = Date.now();

    // Invalid request — return validation error as observation
    if (!request.validated) {
      const result: ToolResult = {
        toolCallId: request.toolCallId,
        toolName: request.toolName,
        output: `Error: ${request.validationError}`,
        isError: true,
        durationMs: 0,
      };
      options?.onToolEnd?.(result);
      results.push(result);
      continue;
    }

    const tool = registry.get(request.toolName);
    if (!tool) {
      const result: ToolResult = {
        toolCallId: request.toolCallId,
        toolName: request.toolName,
        output: `Error: Tool "${request.toolName}" not found in registry`,
        isError: true,
        durationMs: 0,
      };
      options?.onToolEnd?.(result);
      results.push(result);
      continue;
    }

    options?.onToolStart?.(request.toolName, request.args);

    const result = await executeWithPolicy(
      request,
      tool.execute,
      tool.metadata.timeoutMs,
      tool.metadata.idempotent,
      tool.metadata.retryableErrors,
    );

    result.durationMs = Date.now() - startTime;
    options?.onToolEnd?.(result);
    results.push(result);
  }

  return results;
}

/**
 * Executes a single tool with timeout and retry policy.
 */
async function executeWithPolicy(
  request: ActionRequest,
  executeFn: (args: Record<string, unknown>) => Promise<string>,
  timeoutMs: number,
  idempotent: boolean,
  retryableErrors: string[],
): Promise<ToolResult> {
  const attempt = async (): Promise<ToolResult> => {
    try {
      const output = await withTimeout(
        executeFn(request.args),
        timeoutMs,
        request.toolName,
      );

      return {
        toolCallId: request.toolCallId,
        toolName: request.toolName,
        output,
        isError: false,
        durationMs: 0, // Set by caller
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        toolCallId: request.toolCallId,
        toolName: request.toolName,
        output: `Error executing tool "${request.toolName}": ${errorMessage}`,
        isError: true,
        durationMs: 0,
      };
    }
  };

  // First attempt
  const firstResult = await attempt();

  // If succeeded or non-idempotent → return immediately (no retry for non-idempotent)
  if (!firstResult.isError || !idempotent) {
    return firstResult;
  }

  // Check if error is retryable
  const isRetryable = retryableErrors.some((pattern) =>
    firstResult.output.toLowerCase().includes(pattern.toLowerCase()),
  );

  if (!isRetryable) {
    return firstResult;
  }

  // Retry once for idempotent tools with retryable errors
  return attempt();
}

/**
 * Wraps a promise with a timeout.
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  toolName: string,
): Promise<T> {
  if (timeoutMs <= 0) return promise;

  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Tool "${toolName}" timed out after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);
}
