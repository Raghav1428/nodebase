import { describe, it, expect, vi } from "vitest";
import { trimMessages, estimateTokens } from "@/features/executions/components/ai-agent/agent/memory/trim";
import type { AgentMessage } from "@/features/executions/components/ai-agent/agent/types";

describe("estimateTokens", () => {
  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("estimates tokens from word count", () => {
    const text = "hello world foo bar";
    // 4 words × 1.33 ≈ 6
    expect(estimateTokens(text)).toBe(6);
  });

  it("handles single word", () => {
    expect(estimateTokens("hello")).toBe(2); // 1 × 1.33 → ceil = 2
  });
});

describe("trimMessages", () => {
  const systemMsg: AgentMessage = { role: "system", content: "You are a helpful assistant." };
  const userMsg1: AgentMessage = { role: "user", content: "First question" };
  const assistantMsg1: AgentMessage = { role: "assistant", content: "First answer" };
  const userMsg2: AgentMessage = { role: "user", content: "Second question" };
  const assistantMsg2: AgentMessage = { role: "assistant", content: "Second answer" };
  const toolMsg: AgentMessage = {
    role: "tool",
    content: [{ type: "tool-result", toolCallId: "tc1", toolName: "search", output: { type: "text", value: "result" } }],
  };

  it("returns all messages when under budget", () => {
    const messages = [systemMsg, userMsg1, assistantMsg1];
    const result = trimMessages(messages, 100_000, "heuristic");
    expect(result).toHaveLength(3);
  });

  it("returns messages unchanged with strategy 'none'", () => {
    const messages = [systemMsg, userMsg1, assistantMsg1];
    const result = trimMessages(messages, 1, "none");
    expect(result).toHaveLength(3); // Not trimmed regardless of budget
  });

  it("preserves system, last user, and last assistant messages", () => {
    const messages = [systemMsg, userMsg1, assistantMsg1, userMsg2, assistantMsg2];
    const result = trimMessages(messages, 10, "heuristic");

    // System, last user, last assistant should always be preserved
    expect(result.find((m) => m.role === "system")).toBeDefined();
    expect(result[result.length - 1]).toBe(assistantMsg2);
    expect(result.some((m) => m === userMsg2)).toBe(true);
  });

  it("preserves latest tool messages in the preserved window", () => {
    const assistantWithTools: AgentMessage = {
      role: "assistant",
      content: [{ type: "tool-call", toolCallId: "tc1", toolName: "search", args: {} }],
    };
    const messages = [
      systemMsg,
      userMsg1,
      assistantMsg1,
      userMsg2,
      assistantWithTools,
      toolMsg,
      assistantMsg2,
    ];
    const result = trimMessages(messages, 10, "heuristic");

    // System + last assistant should be preserved
    expect(result.find((m) => m.role === "system")).toBeDefined();
    expect(result.some((m) => m === assistantMsg2)).toBe(true);
  });

  it("trims oldest messages first", () => {
    const messages = [systemMsg, userMsg1, assistantMsg1, userMsg2, assistantMsg2];
    const result = trimMessages(messages, 10, "heuristic");

    // The oldest non-preserved messages (userMsg1, assistantMsg1) should be removed first
    expect(result.length).toBeLessThan(messages.length);
  });

  it("handles empty messages array", () => {
    const result = trimMessages([], 100, "heuristic");
    expect(result).toEqual([]);
  });
});
