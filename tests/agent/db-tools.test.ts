import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { ToolRegistry } from "@/features/executions/components/ai-agent/agent/tools/registry";
import { createActionRequests } from "@/features/executions/components/ai-agent/agent/engine/create-action-requests";
import { DEFAULT_TOOL_METADATA } from "@/features/executions/components/ai-agent/agent/types";
import type { ToolDefinition, RawToolCall } from "@/features/executions/components/ai-agent/agent/types";

// Simulated DB tool schemas matching db-tools.ts
const querySchema = z.object({
  limit: z.number().min(1).max(100).optional(),
});

const saveSchema = z.object({
  content: z.string().min(1),
  role: z.enum(["user", "assistant"]).optional(),
});

function createDbToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  registry.register({
    name: "query_chat_history",
    description: "Query chat history",
    parameters: querySchema,
    metadata: {
      ...DEFAULT_TOOL_METADATA,
      idempotent: true,
      retryableErrors: ["ECONNREFUSED"],
    },
    execute: vi.fn().mockResolvedValue("[]"),
  });

  registry.register({
    name: "save_note",
    description: "Save a note",
    parameters: saveSchema,
    metadata: {
      ...DEFAULT_TOOL_METADATA,
      idempotent: false,
    },
    execute: vi.fn().mockResolvedValue("saved"),
  });

  return registry;
}

describe("DB Tool validation", () => {
  describe("query_chat_history", () => {
    it("accepts valid limit", () => {
      const registry = createDbToolRegistry();
      const calls: RawToolCall[] = [
        { toolCallId: "tc1", toolName: "query_chat_history", args: { limit: 20 } },
      ];
      const requests = createActionRequests(calls, registry);
      expect(requests[0].validated).toBe(true);
      expect(requests[0].args).toEqual({ limit: 20 });
    });

    it("accepts missing limit (optional)", () => {
      const registry = createDbToolRegistry();
      const calls: RawToolCall[] = [
        { toolCallId: "tc2", toolName: "query_chat_history", args: {} },
      ];
      const requests = createActionRequests(calls, registry);
      expect(requests[0].validated).toBe(true);
    });

    it("rejects negative limit", () => {
      const registry = createDbToolRegistry();
      const calls: RawToolCall[] = [
        { toolCallId: "tc3", toolName: "query_chat_history", args: { limit: -1 } },
      ];
      const requests = createActionRequests(calls, registry);
      expect(requests[0].validated).toBe(false);
      expect(requests[0].validationError).toContain("Invalid arguments");
    });

    it("rejects limit > 100", () => {
      const registry = createDbToolRegistry();
      const calls: RawToolCall[] = [
        { toolCallId: "tc4", toolName: "query_chat_history", args: { limit: 200 } },
      ];
      const requests = createActionRequests(calls, registry);
      expect(requests[0].validated).toBe(false);
    });
  });

  describe("save_note", () => {
    it("accepts valid content", () => {
      const registry = createDbToolRegistry();
      const calls: RawToolCall[] = [
        { toolCallId: "tc5", toolName: "save_note", args: { content: "hello" } },
      ];
      const requests = createActionRequests(calls, registry);
      expect(requests[0].validated).toBe(true);
    });

    it("accepts content with role", () => {
      const registry = createDbToolRegistry();
      const calls: RawToolCall[] = [
        {
          toolCallId: "tc6",
          toolName: "save_note",
          args: { content: "hello", role: "user" },
        },
      ];
      const requests = createActionRequests(calls, registry);
      expect(requests[0].validated).toBe(true);
    });

    it("rejects empty content", () => {
      const registry = createDbToolRegistry();
      const calls: RawToolCall[] = [
        { toolCallId: "tc7", toolName: "save_note", args: { content: "" } },
      ];
      const requests = createActionRequests(calls, registry);
      expect(requests[0].validated).toBe(false);
      expect(requests[0].validationError).toContain("Invalid arguments");
    });

    it("rejects invalid role", () => {
      const registry = createDbToolRegistry();
      const calls: RawToolCall[] = [
        {
          toolCallId: "tc8",
          toolName: "save_note",
          args: { content: "hello", role: "admin" },
        },
      ];
      const requests = createActionRequests(calls, registry);
      expect(requests[0].validated).toBe(false);
    });
  });

  describe("unknown tools", () => {
    it("creates invalid request for unknown tool", () => {
      const registry = createDbToolRegistry();
      const calls: RawToolCall[] = [
        { toolCallId: "tc9", toolName: "nonexistent_tool", args: {} },
      ];
      const requests = createActionRequests(calls, registry);
      expect(requests[0].validated).toBe(false);
      expect(requests[0].validationError).toContain('Unknown tool "nonexistent_tool"');
      expect(requests[0].validationError).toContain("query_chat_history");
    });
  });
});
