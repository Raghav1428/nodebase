import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import prisma from "@/lib/db";
import { topologicalSort } from "./utils";
import { ExecutionStatus, NodeType } from "@/generated/prisma";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import { httpRequestChannel } from "./channels/http-request";
import { manualTriggerChannel } from "./channels/manual-trigger";
import { googleFormTriggerChannel } from "./channels/google-form-trigger";
import { stripeTriggerChannel } from "./channels/stripe-trigger";
import { geminiChannel } from "./channels/gemini";
import { openAIChannel } from "./channels/openai";
import { anthropicChannel } from "./channels/anthropic";
import { discordChannel } from "./channels/discord";
import { slackChannel } from "./channels/slack";
import { webhookTriggerChannel } from "./channels/webhook-trigger";
import { scheduledTriggerChannel } from "./channels/scheduled-trigger";
import { telegramChannel } from "./channels/telegram";
import { openRouterChannel } from "./channels/openrouter";
import { postgresChannel } from "./channels/postgres";
import { aiAgentChannel } from "./channels/ai-agent";
import { mongodbChannel } from "./channels/mongodb";
import { mcpToolsChannel } from "./channels/mcp-tools";
import { geminiChatModelChannel } from "./channels/gemini-chat-model";
import { anthropicChatModelChannel } from "./channels/anthropic-chat-model";
import { openRouterChatModelChannel } from "./channels/openrouter-chat-model";
import { openAIChatModelChannel } from "./channels/openai-chat-model";
import { polarClient } from "@/lib/polar";

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: 0,
    onFailure: async ({ event, step }) => {
      return prisma.execution.update({
        where: { inngestEventId: event.data.event.id },
        data: {
          status: ExecutionStatus.FAILED,
          error: event.data.error.message,
          errorStack: event.data.error.stack,
        }
      })
    }
  },
  {
    event: "workflows/execute.workflow",
    channels: [
      httpRequestChannel(),
      manualTriggerChannel(),
      googleFormTriggerChannel(),
      stripeTriggerChannel(),
      webhookTriggerChannel(),
      scheduledTriggerChannel(),
      geminiChannel(),
      openAIChannel(),
      anthropicChannel(),
      openRouterChannel(),
      discordChannel(),
      slackChannel(),
      telegramChannel(),
      postgresChannel(),
      aiAgentChannel(),
      mongodbChannel(),
      mcpToolsChannel(),
      geminiChatModelChannel(),
      anthropicChatModelChannel(),
      openRouterChatModelChannel(),
      openAIChatModelChannel(),
    ]
  },
  async ({ event, step, publish }) => {

    const inngestEventId = event.id;
    const workflowId = event.data.workflowId;

    if (!inngestEventId || !workflowId) throw new NonRetriableError("Event ID or Workflow ID is missing");

    await step.run("create-execution", async () => {
      await prisma.execution.create({
        data: {
          workflowId,
          inngestEventId,
        },
      });
    });

    await step.run("check-execution-limit", async () => {
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        select: { userId: true }
      });

      if (!workflow) return;

      let hasActiveSubscription = false;

      try {
        const customer = await polarClient.customers.getStateExternal({
          externalId: workflow.userId,
        });

        hasActiveSubscription = customer?.activeSubscriptions && customer.activeSubscriptions.length > 0;
      } catch (error) {
        // If customer not found or other error, assume no subscription (free tier)
      }

      if (!hasActiveSubscription) {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const executionCount = await prisma.execution.count({
          where: {
            workflow: { userId: workflow.userId },
            startedAt: {
              gte: firstDayOfMonth,
            }
          }
        });

        if (executionCount > 100) {
          throw new NonRetriableError("Monthly execution limit reached. Upgrade to Pro for unlimited executions.");
        }
      }
    });

    const { sortedNodes, nodesToSkip } = await step.run("prepare-workflow", async () => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: {
          id: workflowId,
        },
        include: {
          nodes: true,
          connections: true,
        }
      });

      const sorted = topologicalSort(workflow.nodes, workflow.connections);

      // Node types that AI Agent orchestrates - these should be skipped in main loop
      const AI_AGENT_CHILD_TYPES: NodeType[] = [
        NodeType.OPENAI_CHAT_MODEL,
        NodeType.ANTHROPIC_CHAT_MODEL,
        NodeType.GEMINI_CHAT_MODEL,
        NodeType.OPENROUTER_CHAT_MODEL,
        NodeType.POSTGRES,
        NodeType.MONGODB,
      ];

      // Find nodes that are connected TO AI Agent nodes as inputs AND are orchestrated types
      // Trigger nodes and other node types should NOT be skipped
      const aiAgentNodes = workflow.nodes.filter(n => n.type === NodeType.AI_AGENT);
      const skipNodeIds = new Set<string>();

      for (const agentNode of aiAgentNodes) {
        const incomingConnections = workflow.connections.filter(c => c.toNodeId === agentNode.id);
        for (const conn of incomingConnections) {
          const sourceNode = workflow.nodes.find(n => n.id === conn.fromNodeId);
          // Only skip if it's a node type that AI Agent orchestrates
          if (sourceNode && AI_AGENT_CHILD_TYPES.includes(sourceNode.type as NodeType)) {
            skipNodeIds.add(conn.fromNodeId);
          }
        }
      }

      return { sortedNodes: sorted, nodesToSkip: Array.from(skipNodeIds) };
    });

    const userId = await step.run("find-user-id", async () => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: {
          id: workflowId,
        },
        select: {
          userId: true,
        }
      });

      return workflow.userId;
    });

    // initialize context with any initial data from the trigger
    let context = event.data.initialData || {};

    for (const node of sortedNodes) {
      // Skip nodes that will be orchestrated by AI Agent
      if (nodesToSkip.includes(node.id)) {
        continue;
      }

      const executor = getExecutor(node.type as NodeType);
      context = await executor({
        data: node.data as Record<string, unknown>,
        nodeId: node.id,
        userId,
        context,
        step,
        publish
      })
    }

    await step.run("update-execution", async () => {
      await prisma.execution.update({
        where: {
          inngestEventId,
          workflowId,
        },
        data: {
          status: ExecutionStatus.SUCCESS,
          completedAt: new Date(),
          output: context,
        },
      });
    });

    return {
      workflowId,
      result: context,
    };
  },
);