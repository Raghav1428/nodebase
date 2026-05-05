import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, type ModelMessage } from "ai";
import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { anthropicChatModelChannel } from "@/inngest/channels/anthropic-chat-model";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context);
  const safeString = new Handlebars.SafeString(jsonString);
  return safeString;
});

type AnthropicChatModelNodeData = {
  credentialId?: string;
  model?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

// Chat message with role for proper conversation history
type ChatMessageWithRole = {
  role: "user" | "assistant";
  content: string;
};

// MCP Tools config from AI Agent
type McpToolsNodeConfig = {
  transportType?: "sse" | "stdio" | "http";
  serverUrl?: string;
  command?: string;
  args?: string;
};

export const anthropicChatModelExecutor: NodeExecutor<
  AnthropicChatModelNodeData
> = async ({ data, nodeId, userId, context, step, publish }) => {
  // When called from agent loop, skip step.run wrappers to avoid HTTP round-trip overhead.
  // Publish and credential fetch are cheap, idempotent operations.
  const isAgentLoop = !!context._agentIteration;

  // Publish loading status
  const publishLoading = async () => {
    await publish(
      anthropicChatModelChannel().status({
        nodeId,
        status: "loading",
      }),
    );
  };
  if (isAgentLoop) {
    await publishLoading();
  } else {
    const iterSuffix = '';
    await step.run(`publish-anthropic-loading-${nodeId}${iterSuffix}`, publishLoading);
  }

  if (!data.credentialId) {
    await publish(
      anthropicChatModelChannel().status({ nodeId, status: "error" }),
    );
    throw new NonRetriableError(
      "Anthropic Chat Model Node: Credential is required",
    );
  }

  if (!data.userPrompt) {
    await publish(
      anthropicChatModelChannel().status({ nodeId, status: "error" }),
    );
    throw new NonRetriableError(
      "Anthropic Chat Model Node: User prompt is required",
    );
  }

  const systemPrompt = data.systemPrompt
    ? Handlebars.compile(data.systemPrompt)(context)
    : "You are a helpful assistant.";
  const userPrompt = Handlebars.compile(data.userPrompt)(context);

  // Fetch credential — skip step.run in agent loop
  let credential;
  if (isAgentLoop) {
    credential = await prisma.credential.findUnique({
      where: { id: data.credentialId, userId },
    });
  } else {
    credential = await step.run(
      `get-anthropic-credential-${nodeId}`,
      () => {
        return prisma.credential.findUnique({
          where: { id: data.credentialId, userId },
        });
      },
    );
  }

  if (!credential) {
    await publish(
      anthropicChatModelChannel().status({ nodeId, status: "error" }),
    );
    throw new NonRetriableError(
      "Anthropic Chat Model Node: Credential not found",
    );
  }

  const anthropic = createAnthropic({
    apiKey: decrypt(credential.value),
  });

  try {
    // Get messages directly from AI Agent if provided, else build them locally
    let messages: ModelMessage[] = [];
    if (context._agentMessages && Array.isArray(context._agentMessages)) {
      // Prepend system prompt even when agent provides messages
      messages = [
        { role: "system", content: systemPrompt },
        ...(context._agentMessages as ModelMessage[]),
      ];
    } else {
      const chatHistory = (context._chatHistory as ChatMessageWithRole[]) || [];
      messages = [
        { role: "system", content: systemPrompt },
        ...chatHistory.map(
          (msg) =>
            ({
              role: msg.role as "user" | "assistant",
              content: msg.content,
            }) as ModelMessage,
        ),
        { role: "user", content: userPrompt },
      ];
    }

    // Get tools directly from AI Agent if provided
    const mcpTools = context._agentTools as Record<string, unknown> | undefined;

    // Build generateText options
    const generateTextOptions: Parameters<typeof generateText>[0] = {
      model: anthropic(data.model || "claude-sonnet-4-20250514"),
      messages,
      experimental_telemetry: {
        isEnabled: true,
        recordInputs: true,
        recordOutputs: true,
      },
    };

    // Add tools if available (no maxSteps, return immediately upon tool call)
    if (mcpTools && Object.keys(mcpTools).length > 0) {
      (generateTextOptions as any).tools = mcpTools;
    }

    const result = await generateText(generateTextOptions);
    const text = result?.text ?? "";
    const toolCalls = result?.toolCalls ?? [];

    // Publish success status
    const publishSuccess = async () => {
      await publish(
        anthropicChatModelChannel().status({
          nodeId,
          status: "success",
        }),
      );
    };
    if (isAgentLoop) {
      await publishSuccess();
    } else {
      await step.run(`publish-anthropic-success-${nodeId}`, publishSuccess);
    }

    return {
      ...context,
      _chatModelResponse: text,
      _chatModelToolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      _chatModelResponseMessages: result.response?.messages,
      _chatHistory: undefined,
    };
  } catch (error) {
    const publishError = async () => {
      await publish(
        anthropicChatModelChannel().status({
          nodeId,
          status: "error",
        }),
      );
    };
    if (isAgentLoop) {
      await publishError();
    } else {
      await step.run(`publish-anthropic-error-${nodeId}`, publishError);
    }

    throw new NonRetriableError(
      "Anthropic Chat Model Node: Anthropic execution failed",
      {
        cause: error,
      },
    );
  }
};
