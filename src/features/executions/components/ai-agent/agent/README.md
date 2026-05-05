# AI Agent V2 — Modular ReAct Agent

A production-ready AI Agent module for nodebase, modeled after n8n Tools Agent V3 behavior. Implements an engine-driven ReAct (Reason + Act) loop with modular tool support, memory management, and structured output parsing.

## Architecture

```
src/features/executions/components/ai-agent/
├── executor.ts                    # Thin entrypoint — resolves nodes, delegates to orchestrator
├── agent/
│   ├── types.ts                   # Core types: AgentConfig, ToolDefinition, ToolMetadata, etc.
│   ├── orchestrator.ts            # ReAct loop: model → detect tools → execute → observe → repeat
│   ├── prompt.ts                  # System prompt builder with tool descriptions
│   ├── output-parser.ts           # Fail-soft structured output parser (Zod)
│   ├── tools/
│   │   ├── registry.ts            # Central tool registry with AI SDK conversion
│   │   ├── mcp-adapter.ts         # Wraps MCP server tools as ToolDefinitions
│   │   └── db-tools.ts            # Pre-defined Postgres/MongoDB tools
│   ├── engine/
│   │   ├── create-action-requests.ts  # Validates tool calls → ActionRequests
│   │   └── execute-actions.ts         # Executes with timeout/retry policy
│   └── memory/
│       ├── store.ts               # Load/save chat history via DB executors
│       └── trim.ts                # Token budget trimming with preserved window

src/app/api/agent/
├── run/route.ts                   # POST /api/agent/run (non-streaming)
└── stream/route.ts                # POST /api/agent/stream (SSE)
```

## Sequence Flow

```
User Input
    │
    ▼
┌─────────────┐
│  executor.ts │  Resolves connected nodes (model, DB, tools)
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│   orchestrator.ts │  Bounded ReAct loop (max 10 iterations)
│                   │
│  ┌──────────┐    │
│  │ Load      │    │  1. Load chat history from DB
│  │ Memory    │    │  2. Trim to token budget (8000 default)
│  └────┬─────┘    │
│       │          │
│  ┌────▼─────┐    │
│  │ Call      │    │  3. generateText() with tools
│  │ Model     │◄──┤  4. Fallback model on failure (if configured)
│  └────┬─────┘    │
│       │          │
│  ┌────▼─────┐    │
│  │ Tool      │    │  5. Validate args via Zod
│  │ Calls?    │    │  6. Execute via engine (timeout + retry policy)
│  └────┬─────┘    │  7. Feed observations back → repeat
│       │          │
│  ┌────▼─────┐    │
│  │ Final     │    │  8. Parse structured output (optional, fail-soft)
│  │ Answer    │    │  9. Save to DB
│  └──────────┘    │
└──────────────────┘
```

## Tool Sources

### 1. MCP Tools (via `@modelcontextprotocol/sdk`)

Connect an MCP Tools node to the AI Agent. Supports SSE, HTTP, and stdio transports.

```typescript
// Example: MCP tool node data
{
  transportType: "sse",
  serverUrl: "http://localhost:3001/sse"
}

// Or stdio:
{
  transportType: "stdio",
  command: "npx",
  args: "-y @modelcontextprotocol/server-filesystem /path/to/dir"
}
```

MCP tools are automatically discovered, registered with non-idempotent metadata (safe default), and their schemas are converted to AI SDK format.

### 2. Internal DB Tools

When a database node (Postgres or MongoDB) is connected, these tools are auto-registered:

| Tool | Parameters | Idempotent | Description |
|------|-----------|------------|-------------|
| `query_chat_history` | `{ limit?: number (1-100) }` | ✅ Yes | Read conversation history |
| `save_note` | `{ content: string, role?: 'user'\|'assistant' }` | ❌ No | Write to database |

### 3. Local Function Tools

Register custom tools via the `ToolRegistry`:

```typescript
import { ToolRegistry } from "./agent/tools/registry";
import { z } from "zod";

const registry = new ToolRegistry();

registry.register({
  name: "calculate",
  description: "Evaluate a math expression",
  parameters: z.object({
    expression: z.string().describe("Math expression to evaluate"),
  }),
  metadata: {
    idempotent: true,        // Safe to retry
    retryableErrors: [],
    timeoutMs: 5_000,
    parallelExecution: true, // Read-only, future parallel support
  },
  execute: async (args) => {
    // Your logic here
    return String(eval(args.expression));
  },
});
```

## Retry Policy

Retry behavior is controlled per-tool via `ToolMetadata`:

| `idempotent` | Error matches `retryableErrors` | Behavior |
|---|---|---|
| `false` | — | **Never retry**. Error returned as observation. |
| `true` | ✅ Yes | **1 retry**. If retry fails, error returned. |
| `true` | ❌ No | **No retry**. Error returned as observation. |

## Memory & Token Trimming

### Trim Strategy: `'heuristic'`

Uses word-count estimation (~1.33 tokens/word). Trims oldest messages first.

**Hard minimum preserved window** (never trimmed):
1. System prompt message
2. Last user message
3. Last assistant message
4. All tool messages from the latest tool-call cycle

### Trim Strategy: `'none'`

Bypass trimming entirely. Messages passed to the model unmodified.

## Structured Output Parser

Optional fail-soft parser backed by Zod:

```typescript
import { createOutputParser } from "./agent/output-parser";
import { z } from "zod";

const parser = createOutputParser(
  z.object({
    summary: z.string(),
    confidence: z.number().min(0).max(1),
  }),
  false // strict = false (default): returns ParseResult, never throws
);

const result = parser.parse(llmResponse);
if (result.success) {
  console.log(result.data.summary);
} else {
  // Fail-soft: raw text + error available
  console.log(result.raw, result.error);
}
```

## API Endpoints

### POST `/api/agent/run`

Non-streaming execution trigger.

**Request:**
```json
{
  "workflowId": "clxyz...",
  "input": "What's the weather in Tokyo?",
  "sessionId": "session-123",
  "initialData": { "key": "value" }
}
```

**Response:**
```json
{
  "success": true,
  "eventId": "evt_abc123",
  "workflowId": "clxyz...",
  "message": "Agent execution started. Poll executions API for results."
}
```

### POST `/api/agent/stream`

SSE streaming endpoint with heartbeat.

**Events:**
```
event: status
data: {"iteration":0,"phase":"thinking","message":"Starting agent execution..."}

:ping

event: done
data: {"eventId":"evt_abc123","workflowId":"clxyz..."}
```

## Setup

```bash
# Already installed via npm
npm install  # vitest added as devDependency

# Run tests
npm run test

# Watch mode
npm run test:watch

# Type check
npx tsc --noEmit
```

## Test Coverage

| Test File | Tests | What's Covered |
|-----------|-------|---------------|
| `orchestrator.test.ts` | 9 | Token trimming, preserved window, trim strategies |
| `output-parser.test.ts` | 12 | JSON extraction, code fences, fail-soft, strict mode |
| `mcp-adapter.test.ts` | 8 | Registry ops, AI SDK conversion, metadata assertions |
| `db-tools.test.ts` | 9 | Zod validation, invalid inputs, unknown tools |
| `retry-policy.test.ts` | 5 | Non-idempotent no-retry, idempotent retry, timeouts |
| `executor-compat.test.ts` | 5 | Context field contract preservation |
| `sse-contract.test.ts` | 7 | Event ordering, heartbeat, error termination |
| **Total** | **55** | |
