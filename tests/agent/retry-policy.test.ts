import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { executeActions } from "@/features/executions/components/ai-agent/agent/engine/execute-actions";
import { ToolRegistry } from "@/features/executions/components/ai-agent/agent/tools/registry";
import { DEFAULT_TOOL_METADATA } from "@/features/executions/components/ai-agent/agent/types";
import type { ActionRequest, ToolDefinition } from "@/features/executions/components/ai-agent/agent/types";

function makeRequest(overrides: Partial<ActionRequest>): ActionRequest {
  return {
    id: "req-1",
    toolCallId: "tc-1",
    toolName: "test_tool",
    args: {},
    validated: true,
    toolMetadata: { ...DEFAULT_TOOL_METADATA },
    ...overrides,
  };
}

describe("Retry policy", () => {
  it("does NOT retry non-idempotent tools on failure", async () => {
    const executeFn = vi.fn().mockRejectedValue(new Error("DB write failed"));

    const registry = new ToolRegistry();
    registry.register({
      name: "save_data",
      description: "Write to database",
      parameters: z.object({}),
      metadata: {
        ...DEFAULT_TOOL_METADATA,
        idempotent: false, // Non-idempotent — NO retry
        timeoutMs: 5000,
      },
      execute: executeFn,
    });

    const request = makeRequest({
      toolName: "save_data",
      toolMetadata: {
        ...DEFAULT_TOOL_METADATA,
        idempotent: false,
        timeoutMs: 5000,
      },
    });

    const results = await executeActions([request], registry);

    expect(results).toHaveLength(1);
    expect(results[0].isError).toBe(true);
    expect(results[0].output).toContain("DB write failed");
    // Execute was called exactly ONCE — no retry
    expect(executeFn).toHaveBeenCalledTimes(1);
  });

  it("retries idempotent tools on retryable errors", async () => {
    const executeFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValueOnce("success");

    const registry = new ToolRegistry();
    registry.register({
      name: "search",
      description: "Search API",
      parameters: z.object({}),
      metadata: {
        ...DEFAULT_TOOL_METADATA,
        idempotent: true,
        retryableErrors: ["ECONNREFUSED"],
        timeoutMs: 5000,
      },
      execute: executeFn,
    });

    const request = makeRequest({
      toolName: "search",
      toolMetadata: {
        ...DEFAULT_TOOL_METADATA,
        idempotent: true,
        retryableErrors: ["ECONNREFUSED"],
        timeoutMs: 5000,
      },
    });

    const results = await executeActions([request], registry);

    expect(results).toHaveLength(1);
    expect(results[0].isError).toBe(false);
    expect(results[0].output).toBe("success");
    // Execute called twice: first failure + retry success
    expect(executeFn).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry idempotent tools on non-retryable errors", async () => {
    const executeFn = vi.fn().mockRejectedValue(new Error("Auth failed"));

    const registry = new ToolRegistry();
    registry.register({
      name: "api_call",
      description: "API",
      parameters: z.object({}),
      metadata: {
        ...DEFAULT_TOOL_METADATA,
        idempotent: true,
        retryableErrors: ["ECONNREFUSED", "ETIMEDOUT"], // Auth failed is NOT retryable
        timeoutMs: 5000,
      },
      execute: executeFn,
    });

    const request = makeRequest({
      toolName: "api_call",
      toolMetadata: {
        ...DEFAULT_TOOL_METADATA,
        idempotent: true,
        retryableErrors: ["ECONNREFUSED", "ETIMEDOUT"],
        timeoutMs: 5000,
      },
    });

    const results = await executeActions([request], registry);

    expect(results).toHaveLength(1);
    expect(results[0].isError).toBe(true);
    // Only called once — error not retryable
    expect(executeFn).toHaveBeenCalledTimes(1);
  });

  it("handles tool timeout", async () => {
    const executeFn = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 10_000)),
    );

    const registry = new ToolRegistry();
    registry.register({
      name: "slow_tool",
      description: "Very slow tool",
      parameters: z.object({}),
      metadata: {
        ...DEFAULT_TOOL_METADATA,
        idempotent: false,
        timeoutMs: 100, // Very short timeout
      },
      execute: executeFn,
    });

    const request = makeRequest({
      toolName: "slow_tool",
      toolMetadata: {
        ...DEFAULT_TOOL_METADATA,
        idempotent: false,
        timeoutMs: 100,
      },
    });

    const results = await executeActions([request], registry);

    expect(results).toHaveLength(1);
    expect(results[0].isError).toBe(true);
    expect(results[0].output).toContain("timed out");
  });

  it("returns validation error for invalid requests without executing", async () => {
    const executeFn = vi.fn();

    const registry = new ToolRegistry();
    registry.register({
      name: "tool",
      description: "Tool",
      parameters: z.object({}),
      metadata: DEFAULT_TOOL_METADATA,
      execute: executeFn,
    });

    const request = makeRequest({
      validated: false,
      validationError: "Bad arguments",
    });

    const results = await executeActions([request], registry);

    expect(results).toHaveLength(1);
    expect(results[0].isError).toBe(true);
    expect(results[0].output).toContain("Bad arguments");
    // Execute was never called
    expect(executeFn).not.toHaveBeenCalled();
  });
});
