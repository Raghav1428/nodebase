import { NodeType } from "@/generated/prisma";
import { NodeExecutor } from "../types";
import { manualTriggerExecutor } from "@/features/triggers/components/manual-trigger/executor";
import { httpRequestExecutor } from "../components/http-request/executor";
import { googleFormTriggerExecutor } from "@/features/triggers/components/google-form-trigger/executor";
import { googleSheetsTriggerExecutor } from "@/features/triggers/components/google-sheets-trigger/executor";
import { stripeTriggerExecutor } from "@/features/triggers/components/stripe-trigger/executor";
import { geminiExecutor } from "../components/gemini/executor";
import { openaiExecutor } from "../components/openai/executor";
import { anthropicExecutor } from "../components/anthropic/executor";
import { discordExecutor } from "../components/discord/executor";
import { slackExecutor } from "../components/slack/executor";
import { webhookTriggerExecutor } from "@/features/triggers/components/webhook-trigger/executor";
import { scheduledTriggerExecutor } from "@/features/triggers/components/scheduled-trigger/executor";
import { telegramExecutor } from "../components/telegram/executor";
import { openrouterExecutor } from "../components/openrouter/executor";
import { postgresExecutor } from "../components/database/postgres/executor";
import { mongodbExecutor } from "../components/database/mongodb/executor";
import { mcpToolsExecutor } from "../tools/mcp-tools/executor";
import { aiAgentExecutor } from "../components/ai-agent/executor";
import { openAIChatModelExecutor } from "../components/chat-models/openai-chat-model/executor";
import { anthropicChatModelExecutor } from "../components/chat-models/anthropic-chat-model/executor";
import { geminiChatModelExecutor } from "../components/chat-models/gemini-chat-model/executor";
import { openRouterChatModelExecutor } from "../components/chat-models/openrouter-chat-model/executor";
import { emailExecutor } from "../components/email/executor";
import { googleSheetsExecutor } from "../components/google-sheets/executor";

export const executorRegistry: Record<NodeType, NodeExecutor> = {
    [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
    [NodeType.INITIAL]: manualTriggerExecutor,
    [NodeType.HTTP_REQUEST]: httpRequestExecutor,
    [NodeType.GOOGLE_FORM_TRIGGER]: googleFormTriggerExecutor,
    [NodeType.GOOGLE_SHEETS_TRIGGER]: googleSheetsTriggerExecutor,
    [NodeType.STRIPE_TRIGGER]: stripeTriggerExecutor,
    [NodeType.GEMINI]: geminiExecutor,
    [NodeType.ANTHROPIC]: anthropicExecutor,
    [NodeType.OPENAI]: openaiExecutor,
    [NodeType.DISCORD]: discordExecutor,
    [NodeType.OPENROUTER]: openrouterExecutor,
    [NodeType.SLACK]: slackExecutor,
    [NodeType.WEBHOOK_TRIGGER]: webhookTriggerExecutor,
    [NodeType.SCHEDULED_TRIGGER]: scheduledTriggerExecutor,
    [NodeType.TELEGRAM]: telegramExecutor,
    [NodeType.POSTGRES]: postgresExecutor,
    [NodeType.MONGODB]: mongodbExecutor,
    [NodeType.MCP_TOOLS]: mcpToolsExecutor,
    [NodeType.AI_AGENT]: aiAgentExecutor,
    [NodeType.OPENAI_CHAT_MODEL]: openAIChatModelExecutor,
    [NodeType.ANTHROPIC_CHAT_MODEL]: anthropicChatModelExecutor,
    [NodeType.GEMINI_CHAT_MODEL]: geminiChatModelExecutor,
    [NodeType.OPENROUTER_CHAT_MODEL]: openRouterChatModelExecutor,
    [NodeType.EMAIL]: emailExecutor,
    [NodeType.GOOGLE_SHEETS]: googleSheetsExecutor,
}

export const getExecutor = (type: NodeType): NodeExecutor => {
    const executor = executorRegistry[type];
    if (!executor) throw new Error(`No executor found for type ${type}`);
    return executor;
}
