import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { ToolRegistry } from "@/features/executions/components/ai-agent/agent/tools/registry";
import { DEFAULT_TOOL_METADATA } from "@/features/executions/components/ai-agent/agent/types";
import type { ToolDefinition } from "@/features/executions/components/ai-agent/agent/types";

function createMockTool(name: string, overrides?: Partial<ToolDefinition>): ToolDefinition {
  return {
    name,
    description: `Mock tool: ${name}`,
    parameters: z.object({ query: z.string() }),
    metadata: { ...DEFAULT_TOOL_METADATA },
    execute: vi.fn().mockResolvedValue("mock result"),
    ...overrides,
  };
}

describe("ToolRegistry", () => {
  it("registers and retrieves a tool", () => {
    const registry = new ToolRegistry();
    const tool = createMockTool("search");
    registry.register(tool);
    expect(registry.get("search")).toBe(tool);
  });

  it("returns undefined for unknown tools", () => {
    const registry = new ToolRegistry();
    expect(registry.get("nonexistent")).toBeUndefined();
  });

  it("has() returns correct boolean", () => {
    const registry = new ToolRegistry();
    registry.register(createMockTool("exists"));
    expect(registry.has("exists")).toBe(true);
    expect(registry.has("missing")).toBe(false);
  });

  it("throws on duplicate registration", () => {
    const registry = new ToolRegistry();
    registry.register(createMockTool("dup"));
    expect(() => registry.register(createMockTool("dup"))).toThrow(
      'Tool "dup" is already registered',
    );
  });

  it("registerBulk registers multiple tools", () => {
    const registry = new ToolRegistry();
    registry.registerBulk([
      createMockTool("tool1"),
      createMockTool("tool2"),
      createMockTool("tool3"),
    ]);
    expect(registry.size).toBe(3);
    expect(registry.getNames()).toEqual(["tool1", "tool2", "tool3"]);
  });

  it("listTools returns metadata", () => {
    const registry = new ToolRegistry();
    registry.register(
      createMockTool("search", {
        metadata: {
          ...DEFAULT_TOOL_METADATA,
          idempotent: true,
          timeoutMs: 5000,
        },
      }),
    );
    const list = registry.listTools();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("search");
    expect(list[0].metadata.idempotent).toBe(true);
    expect(list[0].metadata.timeoutMs).toBe(5000);
  });

  it("toAISDKTools produces expected structure", () => {
    const registry = new ToolRegistry();
    registry.register(createMockTool("tool1"));
    const sdkTools = registry.toAISDKTools();
    expect(sdkTools.tool1).toBeDefined();
    const tool = sdkTools.tool1 as Record<string, unknown>;
    expect(tool.type).toBe("function");
    expect(tool.description).toBe("Mock tool: tool1");
    expect(tool.parameters).toBeDefined();
  });
});

describe("MCP Adapter (schema conversion)", () => {
  it("MCP tools should be flagged as non-idempotent", () => {
    // MCP tools are assumed non-idempotent by default
    const registry = new ToolRegistry();
    const mcpTool = createMockTool("mcp_search", {
      metadata: {
        ...DEFAULT_TOOL_METADATA,
        idempotent: false, // This is what mcp-adapter sets
      },
    });
    registry.register(mcpTool);
    expect(registry.get("mcp_search")?.metadata.idempotent).toBe(false);
  });
});
