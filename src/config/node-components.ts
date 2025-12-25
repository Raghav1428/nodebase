import { InitialNode } from "@/components/initial-node";
import { AnthropicNode } from "@/features/executions/components/anthropic/node";
import { DiscordNode } from "@/features/executions/components/discord/node";
import { GeminiNode } from "@/features/executions/components/gemini/node";
import { HttpRequestNode } from "@/features/executions/components/http-request/node";
import { OpenAINode } from "@/features/executions/components/openai/node";
import { OpenRouterNode } from "@/features/executions/components/openrouter/node";
import { SlackNode } from "@/features/executions/components/slack/node";
import { TelegramNode } from "@/features/executions/components/telegram/node";
import { PostgresNode } from "@/features/executions/components/database/postgres/node";
import { MongoDBNode } from "@/features/executions/components/database/mongodb/node";
import { McpToolsNode } from "@/features/executions/tools/mcp-tools/node";
import { AiAgentNode } from "@/features/executions/components/ai-agent/node";
import { GoogleFormTriggerNode } from "@/features/triggers/components/google-form-trigger/node";
import { ManualTriggerNode } from "@/features/triggers/components/manual-trigger/node";
import { ScheduledTriggerNode } from "@/features/triggers/components/scheduled-trigger/node";
import { StripeTriggerNode } from "@/features/triggers/components/stripe-trigger/node";
import { WebhookTriggerNode } from "@/features/triggers/components/webhook-trigger/node";
import { NodeType } from "@/generated/prisma";
import { NodeTypes } from "@xyflow/react";
import { GeminiChatModelNode } from "@/features/executions/components/chat-models/gemini-chat-model/node";
import { AnthropicChatModelNode } from "@/features/executions/components/chat-models/anthropic-chat-model/node";
import { OpenRouterChatModelNode } from "@/features/executions/components/chat-models/openrouter-chat-model/node";
import { OpenAIChatModelNode } from "@/features/executions/components/chat-models/openai-chat-model/node";

export const nodeComponents = {
    [NodeType.INITIAL]: InitialNode,
    [NodeType.HTTP_REQUEST]: HttpRequestNode,
    [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
    [NodeType.GOOGLE_FORM_TRIGGER]: GoogleFormTriggerNode,
    [NodeType.STRIPE_TRIGGER]: StripeTriggerNode,
    [NodeType.WEBHOOK_TRIGGER]: WebhookTriggerNode,
    [NodeType.SCHEDULED_TRIGGER]: ScheduledTriggerNode,
    [NodeType.GEMINI]: GeminiNode,
    [NodeType.OPENAI]: OpenAINode,
    [NodeType.ANTHROPIC]: AnthropicNode,
    [NodeType.OPENROUTER]: OpenRouterNode,
    [NodeType.DISCORD]: DiscordNode,
    [NodeType.SLACK]: SlackNode,
    [NodeType.TELEGRAM]: TelegramNode,
    [NodeType.POSTGRES]: PostgresNode,
    [NodeType.MONGODB]: MongoDBNode,
    [NodeType.MCP_TOOLS]: McpToolsNode,
    [NodeType.AI_AGENT]: AiAgentNode,
    [NodeType.OPENAI_CHAT_MODEL]: OpenAIChatModelNode,
    [NodeType.ANTHROPIC_CHAT_MODEL]: AnthropicChatModelNode,
    [NodeType.GEMINI_CHAT_MODEL]: GeminiChatModelNode,
    [NodeType.OPENROUTER_CHAT_MODEL]: OpenRouterChatModelNode,
} as const satisfies NodeTypes;

export type RegisteredType = keyof typeof nodeComponents;