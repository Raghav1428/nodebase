import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { generateText, CoreMessage } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import Handlebars from "handlebars";
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
}

// TOON format: Token-Optimized Object Notation
type ChatMessage = string;

export const anthropicChatModelExecutor: NodeExecutor<AnthropicChatModelNodeData> = async ({ data, nodeId, userId, context, step, publish }) => {
    await publish(
        anthropicChatModelChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    if (!data.credentialId) {
        await publish(anthropicChatModelChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("Anthropic Chat Model Node: Credential is required");
    }

    if (!data.userPrompt) {
        await publish(anthropicChatModelChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("Anthropic Chat Model Node: User prompt is required");
    }

    const systemPrompt = data.systemPrompt ? Handlebars.compile(data.systemPrompt)(context) : "You are a helpful assistant.";
    const userPrompt = Handlebars.compile(data.userPrompt)(context);

    const credential = await step.run(`get-anthropic-credential-${nodeId}`, () => {
        return prisma.credential.findUnique({
            where: { id: data.credentialId, userId },
        })
    });

    if (!credential) {
        await publish(anthropicChatModelChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("Anthropic Chat Model Node: Credential not found");
    }

    const anthropic = createAnthropic({
        apiKey: decrypt(credential.value),
    });

    try {
        const chatHistory = (context._chatHistory as ChatMessage[]) || [];
        const messages: CoreMessage[] = [
            { role: 'system', content: systemPrompt },
            ...chatHistory.map(msg => ({
                role: 'assistant' as const,
                content: msg,
            })),
            { role: 'user', content: userPrompt },
        ];

        const result = await step.ai.wrap(
            `anthropic-chat-model-generate-text-${nodeId}`,
            generateText,
            {
                model: anthropic(data.model || "claude-3-5-sonnet-20241022"),
                messages,
                experimental_telemetry: {
                    isEnabled: true,
                    recordInputs: true,
                    recordOutputs: true,
                },
            },
        );

        const firstContent = (result?.steps?.[0]?.content?.[0] as any);
        const text = firstContent?.text ?? '';

        await publish(
            anthropicChatModelChannel().status({
                nodeId,
                status: "success",
            }),
        );

        return {
            ...context,
            _chatModelResponse: text,
            _chatHistory: undefined,
        };

    } catch (error) {
        await publish(
            anthropicChatModelChannel().status({
                nodeId,
                status: "error",
            }),
        );

        throw new NonRetriableError("Anthropic Chat Model Node: Anthropic execution failed", {
            cause: error,
        });
    }
};
