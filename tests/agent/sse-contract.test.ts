import { describe, it, expect } from "vitest";

/**
 * SSE contract tests.
 *
 * Validates the event ordering and structure for the streaming endpoint.
 * These tests verify the SSE format specification without requiring
 * an actual HTTP server.
 */

function formatSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function parseSSEEvents(raw: string): Array<{ event: string; data: unknown }> {
  const events: Array<{ event: string; data: unknown }> = [];
  const blocks = raw.split("\n\n").filter(Boolean);

  for (const block of blocks) {
    // Skip heartbeat pings
    if (block.trim() === ":ping") continue;

    const eventMatch = block.match(/^event: (.+)$/m);
    const dataMatch = block.match(/^data: (.+)$/m);

    if (eventMatch && dataMatch) {
      events.push({
        event: eventMatch[1],
        data: JSON.parse(dataMatch[1]),
      });
    }
  }

  return events;
}

describe("SSE event format", () => {
  it("formats events correctly", () => {
    const event = formatSSE("status", { iteration: 1, phase: "thinking" });
    expect(event).toBe(
      'event: status\ndata: {"iteration":1,"phase":"thinking"}\n\n',
    );
  });

  it("heartbeat is a valid SSE comment", () => {
    const heartbeat = ":ping\n\n";
    // SSE spec: lines starting with : are comments (ignored by EventSource)
    expect(heartbeat.startsWith(":")).toBe(true);
  });
});

describe("SSE event ordering", () => {
  it("status → done is valid for simple responses", () => {
    const raw =
      formatSSE("status", { iteration: 0, phase: "thinking" }) +
      formatSSE("done", { response: "Hello!", iterations: 1 });

    const events = parseSSEEvents(raw);
    expect(events[0].event).toBe("status");
    expect(events[events.length - 1].event).toBe("done");
  });

  it("status → tool_call → tool_result → done is valid for tool usage", () => {
    const raw =
      formatSSE("status", { iteration: 1, phase: "thinking" }) +
      formatSSE("tool_call", { toolName: "search", args: { q: "test" } }) +
      formatSSE("tool_result", {
        toolName: "search",
        output: "found it",
        isError: false,
        durationMs: 150,
      }) +
      formatSSE("status", { iteration: 2, phase: "thinking" }) +
      formatSSE("done", { response: "Here's what I found", iterations: 2 });

    const events = parseSSEEvents(raw);

    // Verify ordering
    expect(events[0].event).toBe("status");
    expect(events[1].event).toBe("tool_call");
    expect(events[2].event).toBe("tool_result");
    expect(events[3].event).toBe("status");
    expect(events[4].event).toBe("done");
  });

  it("error event terminates the stream", () => {
    const raw =
      formatSSE("status", { iteration: 0, phase: "thinking" }) +
      formatSSE("error", { message: "Model failed", code: "MODEL_ERROR" });

    const events = parseSSEEvents(raw);
    expect(events[events.length - 1].event).toBe("error");
    const errorData = events[events.length - 1].data as { message: string; code: string };
    expect(errorData.code).toBe("MODEL_ERROR");
  });

  it("chunk events come between status and done", () => {
    const raw =
      formatSSE("status", { iteration: 1, phase: "thinking" }) +
      formatSSE("chunk", { text: "Hello " }) +
      formatSSE("chunk", { text: "world!" }) +
      formatSSE("done", { response: "Hello world!", iterations: 1 });

    const events = parseSSEEvents(raw);
    expect(events[0].event).toBe("status");
    expect(events[1].event).toBe("chunk");
    expect(events[2].event).toBe("chunk");
    expect(events[3].event).toBe("done");
  });

  it("handles heartbeat mixed with events", () => {
    const raw =
      formatSSE("status", { iteration: 0, phase: "thinking" }) +
      ":ping\n\n" +
      formatSSE("done", { response: "Hi", iterations: 1 }) +
      ":ping\n\n";

    const events = parseSSEEvents(raw);
    // Heartbeats should be filtered out
    expect(events).toHaveLength(2);
    expect(events[0].event).toBe("status");
    expect(events[1].event).toBe("done");
  });
});
