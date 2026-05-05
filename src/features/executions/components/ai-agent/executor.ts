import type { NodeExecutor, WorkflowContext } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { aiAgentChannel } from "@/inngest/channels/ai-agent";
import prisma from "@/lib/db";
import { AIProvider, DATABASE, TOOLS, NodeType } from "@/generated/prisma";
import { getExecutor } from "../../lib/executor-registry";
import { runAgent } from "./agent/orchestrator";
import type { AgentConfig, ConnectedNode } from "./agent/types";
import { DEFAULT_AGENT_CONFIG } from "./agent/types";

type AiAgentData = {
  variableName?: string;
  maxIterations?: number;
  tokenBudget?: number;
  trimStrategy?: "heuristic" | "none";
};

const AI_MODEL_NODE_TYPES: string[] = [
  NodeType.OPENAI_CHAT_MODEL,
  NodeType.ANTHROPIC_CHAT_MODEL,
  NodeType.GEMINI_CHAT_MODEL,
  NodeType.OPENROUTER_CHAT_MODEL,
];

const DATABASE_NODE_TYPES: string[] = [NodeType.POSTGRES, NodeType.MONGODB];

const TOOLS_NODE_TYPES: string[] = [NodeType.MCP_TOOLS];

/**
 * AI Agent Executor — thin entrypoint that resolves connected nodes
 * and delegates to the modular orchestrator.
 *
 * All ReAct loop logic, tool management, memory, and engine are in agent/*.
 * This file only handles:
 * 1. Node resolution from Prisma
 * 2. Config assembly
 * 3. Orchestrator delegation
 * 4. Context cleanup
 */
export const aiAgentExecutor: NodeExecutor<AiAgentData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await step.run(`publish-ai-agent-loading-${nodeId}`, async () => {
    await publish(
      aiAgentChannel().status({
        nodeId,
        status: "loading",
      }),
    );
  });

  try {
    if (!data.variableName) {
      throw new NonRetriableError(
        "AI Agent Node: Variable name is required",
      );
    }

    // -----------------------------------------------------------------
    // Resolve connected nodes (unchanged from original)
    // -----------------------------------------------------------------
    const connectedNodes = await step.run(
      "find-connected-nodes",
      async () => {
        const thisNode = await prisma.node.findUnique({
          where: { id: nodeId },
          select: { workflowId: true },
        });

        if (!thisNode) return null;

        const incomingConnections = await prisma.connection.findMany({
          where: {
            workflowId: thisNode.workflowId,
            toNodeId: nodeId,
          },
          select: {
            fromNodeId: true,
            toInput: true,
          },
        });

        const sourceNodeIds = incomingConnections.map((c) => c.fromNodeId);
        const sourceNodes = await prisma.node.findMany({
          where: { id: { in: sourceNodeIds } },
          select: { id: true, type: true, data: true },
        });

        const connectionMap: Record<string, (typeof sourceNodes)[0]> = {};
        for (const conn of incomingConnections) {
          const sourceNode = sourceNodes.find(
            (n) => n.id === conn.fromNodeId,
          );
          if (sourceNode) {
            connectionMap[conn.toInput || "default"] = sourceNode;
          }
        }

        return { connectionMap, workflowId: thisNode.workflowId };
      },
    );

    if (!connectedNodes) {
      throw new NonRetriableError(
        "AI Agent Node: Could not find workflow",
      );
    }

    const { connectionMap, workflowId } = connectedNodes;

    // Find AI Model node
    let foundModelNode: ConnectedNode | undefined = connectionMap[
      "ai-model"
    ] as ConnectedNode | undefined;
    if (!foundModelNode) {
      const allConnectedNodes = Object.values(connectionMap) as ConnectedNode[];
      foundModelNode = allConnectedNodes.find((n) =>
        AI_MODEL_NODE_TYPES.includes(n.type),
      );
    }

    if (!foundModelNode) {
      throw new NonRetriableError(
        "AI Agent Node: No AI Model node connected. Connect a Chat Model node.",
      );
    }

    // Find Database node
    let databaseNode: ConnectedNode | undefined = connectionMap[
      "database"
    ] as ConnectedNode | undefined;
    if (!databaseNode) {
      const allConnectedNodes = Object.values(connectionMap) as ConnectedNode[];
      databaseNode = allConnectedNodes.find((n) =>
        DATABASE_NODE_TYPES.includes(n.type),
      );
    }

    // Find Tools node
    let toolsNode: ConnectedNode | undefined = connectionMap[
      "tools"
    ] as ConnectedNode | undefined;
    if (!toolsNode) {
      const allConnectedNodes = Object.values(connectionMap) as ConnectedNode[];
      toolsNode = allConnectedNodes.find((n) =>
        TOOLS_NODE_TYPES.includes(n.type),
      );
    }

    // Find fallback model node (second AI model if connected)
    let fallbackModelNode: ConnectedNode | undefined;
    const allConnectedNodes = Object.values(connectionMap) as ConnectedNode[];
    const modelNodes = allConnectedNodes.filter((n) =>
      AI_MODEL_NODE_TYPES.includes(n.type),
    );
    if (modelNodes.length > 1) {
      fallbackModelNode = modelNodes.find(
        (n) => n.id !== foundModelNode!.id,
      );
    }

    // -----------------------------------------------------------------
    // Build config and delegate to orchestrator
    // -----------------------------------------------------------------
    const agentConfig: AgentConfig = {
      modelNode: foundModelNode,
      fallbackModelNode,
      databaseNode,
      toolsNode,
      maxIterations: data.maxIterations || DEFAULT_AGENT_CONFIG.maxIterations,
      tokenBudget: data.tokenBudget || DEFAULT_AGENT_CONFIG.tokenBudget,
      trimStrategy: data.trimStrategy || DEFAULT_AGENT_CONFIG.trimStrategy,
      variableName: data.variableName,
      outputParserStrict: DEFAULT_AGENT_CONFIG.outputParserStrict,
      workflowId,
      agentNodeId: nodeId,
    };

    const { result: agentResult, updatedContext } = await runAgent(
      agentConfig,
      {
        context: {
          ...context,
          _workflowId: workflowId,
          _agentNodeId: nodeId,
        },
        step,
        publish,
        userId,
        getExecutor: (type: string) => getExecutor(type as NodeType),
      },
    );

    // -----------------------------------------------------------------
    // Publish success and clean up context
    // -----------------------------------------------------------------
    await publish(
      aiAgentChannel().status({
        nodeId,
        status: "success",
      }),
    );

    // Clean up internal context fields (preserve backward compatibility)
    const keysToRemove = new Set([
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
      "_agentIteration",
      "_chatModelResponseMessages",
    ]);

    const cleanedContext = Object.fromEntries(
      Object.entries(updatedContext).filter(
        ([key]) => !keysToRemove.has(key),
      ),
    );

    return {
      ...cleanedContext,
      [data.variableName]: agentResult,
    };
  } catch (error) {
    await step.run(`publish-ai-agent-error-${nodeId}`, async () => {
      await publish(
        aiAgentChannel().status({
          nodeId,
          status: "error",
        }),
      );
    });

    if (error instanceof NonRetriableError) {
      throw error;
    }

    throw new NonRetriableError("AI Agent Node: Agent execution failed", {
      cause: error,
    });
  }
};
