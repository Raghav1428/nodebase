import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { generateText, CoreMessage } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import Handlebars from "handlebars";
import { openRouterChatModelChannel } from "@/inngest/channels/openrouter-chat-model";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
    const jsonString = JSON.stringify(context);
    const safeString = new Handlebars.SafeString(jsonString);
    return safeString;
});

type OpenRouterChatModelNodeData = {
    credentialId?: string;
    model?: string;
    systemPrompt?: string;
    userPrompt?: string;
}

// TOON format: Token-Optimized Object Notation
type ChatMessage = string;

export const openRouterChatModelExecutor: NodeExecutor<OpenRouterChatModelNodeData> = async ({ data, nodeId, userId, context, step, publish }) => {
    await publish(
        openRouterChatModelChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    if (!data.credentialId) {
        await publish(openRouterChatModelChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("OpenRouter Chat Model Node: Credential is required");
    }

    if (!data.userPrompt) {
        await publish(openRouterChatModelChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("OpenRouter Chat Model Node: User prompt is required");
    }

    const systemPrompt = data.systemPrompt ? Handlebars.compile(data.systemPrompt)(context) : "You are a helpful assistant.";
    const userPrompt = Handlebars.compile(data.userPrompt)(context);

    const credential = await step.run(`get-openrouter-credential-${nodeId}`, () => {
        return prisma.credential.findUnique({
            where: { id: data.credentialId, userId },
        })
    });

    if (!credential) {
        await publish(openRouterChatModelChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("OpenRouter Chat Model Node: Credential not found");
    }

    const openrouter = createOpenRouter({
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
            `openrouter-chat-model-generate-text-${nodeId}`,
            generateText,
            {
                model: openrouter(data.model || "openai/gpt-4o-mini"),
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
            openRouterChatModelChannel().status({
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
            openRouterChatModelChannel().status({
                nodeId,
                status: "error",
            }),
        );

        throw new NonRetriableError("OpenRouter Chat Model Node: OpenRouter execution failed", {
            cause: error,
        });
    }
};
