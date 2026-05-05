import type { WorkflowContext, StepTools } from "@/features/executions/types";
import type { Realtime } from "@inngest/realtime";
import type { NodeType } from "@/generated/prisma";
import type { ConnectedNode, ChatMessageWithRole, AgentMessage, OrchestratorDeps } from "../types";

/**
 * Loads chat history from the connected database node.
 * Delegates to the existing postgres/mongodb executor in 'query' mode.
 */
export async function loadChatHistory(
  dbNode: ConnectedNode,
  config: { workflowId: string; agentNodeId: string },
  deps: OrchestratorDeps,
): Promise<{
  chatHistory: ChatMessageWithRole[];
  messages: AgentMessage[];
  rawResult: Record<string, unknown>;
}> {
  const operationKey =
    dbNode.type === "POSTGRES" ? "_postgresOperation" : "_mongodbOperation";

  const dbExecutor = deps.getExecutor(dbNode.type);
  const updatedContext = await dbExecutor({
    data: dbNode.data,
    nodeId: dbNode.id,
    userId: deps.userId,
    context: {
      ...deps.context,
      _workflowId: config.workflowId,
      _agentNodeId: config.agentNodeId,
      [operationKey]: "query",
    },
    step: deps.step,
    publish: deps.publish,
  });

  const resultKey =
    dbNode.type === "POSTGRES" ? "_postgresResult" : "_mongodbResult";
  const dbResult = (updatedContext[resultKey] as Record<string, unknown>) || {};
  const chatHistory = (dbResult.chatHistory as ChatMessageWithRole[]) || [];

  // Convert to AgentMessage format
  const messages: AgentMessage[] = chatHistory.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  return { chatHistory, messages, rawResult: dbResult };
}

/**
 * Saves a single message (user or assistant) to the connected database node.
 * Delegates to the existing postgres/mongodb executor in 'save' mode.
 */
export async function saveMessage(
  dbNode: ConnectedNode,
  message: string,
  role: "user" | "assistant",
  config: { workflowId: string; agentNodeId: string },
  deps: OrchestratorDeps,
): Promise<WorkflowContext> {
  if (!message) return deps.context;

  const operationKey =
    dbNode.type === "POSTGRES" ? "_postgresOperation" : "_mongodbOperation";

  const dbExecutor = deps.getExecutor(dbNode.type);
  return dbExecutor({
    data: dbNode.data,
    nodeId: dbNode.id,
    userId: deps.userId,
    context: {
      ...deps.context,
      _workflowId: config.workflowId,
      _agentNodeId: config.agentNodeId,
      [operationKey]: "save",
      _messageToSave: message,
      _messageRole: role,
    },
    step: deps.step,
    publish: deps.publish,
  });
}

/**
 * Saves both user input and assistant response as a turn.
 * Only saves non-empty messages.
 */
export async function saveTurn(
  dbNode: ConnectedNode,
  userMessage: string,
  assistantMessage: string,
  config: { workflowId: string; agentNodeId: string },
  deps: OrchestratorDeps,
): Promise<WorkflowContext> {
  let ctx = deps.context;

  if (userMessage) {
    ctx = await saveMessage(
      dbNode,
      userMessage,
      "user",
      config,
      { ...deps, context: ctx },
    );
  }

  if (assistantMessage) {
    ctx = await saveMessage(
      dbNode,
      assistantMessage,
      "assistant",
      config,
      { ...deps, context: ctx },
    );
  }

  return ctx;
}
