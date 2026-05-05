import type { ZodType } from "zod";
import type { Realtime } from "@inngest/realtime";
import type { StepTools, WorkflowContext } from "@/features/executions/types";

// ---------------------------------------------------------------------------
// Connected node reference (resolved from Prisma at runtime)
// ---------------------------------------------------------------------------

export interface ConnectedNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Tool metadata — controls retry, timeout, and future parallel execution
// ---------------------------------------------------------------------------

export interface ToolMetadata {
  /** Safe to retry on failure? DB writes and side-effecting MCP tools = false */
  idempotent: boolean;
  /** Error messages/codes that should trigger a retry (only if idempotent) */
  retryableErrors: string[];
  /** Per-tool timeout in milliseconds */
  timeoutMs: number;
  /** Future: can execute in parallel with other read-only tools */
  parallelExecution: boolean;
}

export const DEFAULT_TOOL_METADATA: ToolMetadata = {
  idempotent: false,
  retryableErrors: [],
  timeoutMs: 30_000,
  parallelExecution: false,
};

// ---------------------------------------------------------------------------
// Tool definition — registered in the ToolRegistry
// ---------------------------------------------------------------------------

export interface ToolDefinition {
  name: string;
  description: string;
  /** Zod schema for validating tool arguments */
  parameters: ZodType;
  metadata: ToolMetadata;
  /** Execute the tool and return a string observation for the LLM */
  execute: (args: Record<string, unknown>) => Promise<string>;
}

// ---------------------------------------------------------------------------
// Action requests & results (engine layer)
// ---------------------------------------------------------------------------

export interface ActionRequest {
  id: string;
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  validated: boolean;
  validationError?: string;
  toolMetadata: ToolMetadata;
}

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  output: string;
  isError: boolean;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Raw tool call from LLM response
// ---------------------------------------------------------------------------

export interface RawToolCall {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Messages — match AI SDK v5 CoreMessage structure
// ---------------------------------------------------------------------------

export interface ChatMessageWithRole {
  role: "user" | "assistant";
  content: string;
}

/** AI SDK compatible message used throughout the agent */
export type AgentMessage = {
  role: string;
  content?: unknown;
  tool_calls?: unknown[];
  tool_call_id?: string;
  name?: string;
};

// ---------------------------------------------------------------------------
// Output parser — fail-soft by default
// ---------------------------------------------------------------------------

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; raw: string; error: string };

// ---------------------------------------------------------------------------
// Agent configuration
// ---------------------------------------------------------------------------

export interface AgentConfig {
  modelNode: ConnectedNode;
  fallbackModelNode?: ConnectedNode;
  databaseNode?: ConnectedNode;
  toolsNode?: ConnectedNode;
  maxIterations: number;
  tokenBudget: number;
  trimStrategy: "heuristic" | "none";
  variableName: string;
  outputSchema?: ZodType;
  outputParserStrict: boolean;
  workflowId: string;
  agentNodeId: string;
}

export const DEFAULT_AGENT_CONFIG = {
  maxIterations: 10,
  tokenBudget: 8_000,
  trimStrategy: "heuristic" as const,
  outputParserStrict: false,
};

// ---------------------------------------------------------------------------
// Agent result — returned from orchestrator
// ---------------------------------------------------------------------------

export interface AgentResult {
  response: string;
  structuredOutput?: unknown;
  parseError?: string;
  model: string | undefined;
  provider: string;
  iterations: number;
  limitReached: boolean;
  toolsUsed: string[];
  chatHistoryLength: number;
  mcpTools?: {
    available: boolean;
    toolNames: string[];
    toolCount: number;
    transportType: string;
  };
  postgresResult?: {
    chatHistory: ChatMessageWithRole[];
    saved: boolean;
    tableName: string;
  };
  mongodbResult?: {
    chatHistory: ChatMessageWithRole[];
    saved: boolean;
    collectionName: string;
  };
}

// ---------------------------------------------------------------------------
// Orchestrator dependencies — injected from executor.ts
// ---------------------------------------------------------------------------

export interface OrchestratorDeps {
  context: WorkflowContext;
  step: StepTools;
  publish: Realtime.PublishFn;
  userId: string;
  getExecutor: (type: string) => (params: {
    data: Record<string, unknown>;
    nodeId: string;
    userId: string;
    context: WorkflowContext;
    step: StepTools;
    publish: Realtime.PublishFn;
  }) => Promise<WorkflowContext>;
}

// ---------------------------------------------------------------------------
// SSE event types for streaming endpoint
// ---------------------------------------------------------------------------

export type SSEEvent =
  | { event: "status"; data: { iteration: number; phase: "thinking" | "tool_calling" } }
  | { event: "tool_call"; data: { toolName: string; args: Record<string, unknown> } }
  | { event: "tool_result"; data: { toolName: string; output: string; isError: boolean; durationMs: number } }
  | { event: "chunk"; data: { text: string } }
  | { event: "done"; data: AgentResult }
  | { event: "error"; data: { message: string; code: string } };
