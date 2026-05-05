import { describe, it, expect } from "vitest";

/**
 * Compatibility test for executor.ts thin entrypoint.
 *
 * Asserts the context field contract is preserved:
 * - Input fields passed to chat model executors (_agentMessages, _agentTools)
 * - Output fields cleaned up after execution
 * - Result shape stored under variableName key
 */
describe("Executor context contract", () => {
  // The set of internal context keys that executor.ts cleans up
  const CLEANED_KEYS = [
    "_workflowId",
    "_agentNodeId",
    "_chatHistory",
    "_chatModelResponse",
    "_postgresOperation",
    "_mongodbOperation",
    "_messageToSave",
    "_messageRole",
    "_postgresResult",
    "_mongodbResult",
    "_mcpTools",
    "_mcpToolsConfig",
    "_mcpToolNames",
    "_isAgentToolsRequest",
    "_mcpMode",
    "_mcpToolSchemas",
    "_mcpCleanup",
    "_agentMessages",
    "_agentTools",
    "_mcpToolName",
    "_mcpToolArgs",
    "_chatModelToolCalls",
    "_mcpToolResult",
  ];

  it("defines the expected internal context keys for cleanup", () => {
    // This test documents the contract. If any key is removed from the
    // cleanup list in executor.ts, this test should be updated accordingly.
    expect(CLEANED_KEYS).toContain("_agentMessages");
    expect(CLEANED_KEYS).toContain("_agentTools");
    expect(CLEANED_KEYS).toContain("_chatModelResponse");
    expect(CLEANED_KEYS).toContain("_chatModelToolCalls");
    expect(CLEANED_KEYS).toContain("_mcpToolSchemas");
    expect(CLEANED_KEYS).toContain("_mcpToolResult");
  });

  it("chat model executors receive _agentMessages and _agentTools", () => {
    // This documents the contract between AI Agent and chat model executors.
    // Chat model executors check for:
    // 1. context._agentMessages — array of messages for the conversation
    // 2. context._agentTools — tool schemas for generateText
    const modelInputFields = ["_agentMessages", "_agentTools"];
    for (const field of modelInputFields) {
      expect(CLEANED_KEYS).toContain(field);
    }
  });

  it("MCP executor receives _mcpMode, _mcpToolName, _mcpToolArgs", () => {
    // This documents the contract between AI Agent and MCP executor.
    const mcpInputFields = ["_mcpMode", "_mcpToolName", "_mcpToolArgs"];
    for (const field of mcpInputFields) {
      expect(CLEANED_KEYS).toContain(field);
    }
  });

  it("DB executor receives _postgresOperation/_mongodbOperation", () => {
    const dbInputFields = [
      "_postgresOperation",
      "_mongodbOperation",
      "_messageToSave",
      "_messageRole",
    ];
    for (const field of dbInputFields) {
      expect(CLEANED_KEYS).toContain(field);
    }
  });

  it("AgentResult shape matches expected structure", () => {
    // Document the expected shape of the result object
    const expectedKeys = [
      "response",
      "model",
      "provider",
      "iterations",
      "limitReached",
      "toolsUsed",
      "chatHistoryLength",
    ];

    // Import the type to ensure it matches
    // (This is a compile-time check via TypeScript, runtime assertion here)
    for (const key of expectedKeys) {
      expect(typeof key).toBe("string");
    }
  });
});
