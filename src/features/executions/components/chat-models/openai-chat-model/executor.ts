import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { generateText, CoreMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import Handlebars from "handlebars";
import { openAIChatModelChannel } from "@/inngest/channels/openai-chat-model";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
    const jsonString = JSON.stringify(context);
    const safeString = new Handlebars.SafeString(jsonString);
    return safeString;
});

type OpenAIChatModelNodeData = {
    credentialId?: string;
    model?: string;
    systemPrompt?: string;
    userPrompt?: string;
}

// Chat message with role for proper conversation history
type ChatMessageWithRole = {
    role: 'user' | 'assistant';
    content: string;
}

export const openAIChatModelExecutor: NodeExecutor<OpenAIChatModelNodeData> = async ({ data, nodeId, userId, context, step, publish }) => {
    await publish(
        openAIChatModelChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    if (!data.credentialId) {
        await publish(openAIChatModelChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("OpenAI Chat Model Node: Credential is required");
    }

    if (!data.userPrompt) {
        await publish(openAIChatModelChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("OpenAI Chat Model Node: User prompt is required");
    }

    const systemPrompt = data.systemPrompt ? Handlebars.compile(data.systemPrompt)(context) : "You are a helpful assistant.";
    const userPrompt = Handlebars.compile(data.userPrompt)(context);

    const credential = await step.run(`get-openai-credential-${nodeId}`, () => {
        return prisma.credential.findUnique({
            where: { id: data.credentialId, userId },
        })
    });

    if (!credential) {
        await publish(openAIChatModelChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("OpenAI Chat Model Node: Credential not found");
    }

    const openai = createOpenAI({
        apiKey: decrypt(credential.value),
    });

    try {
        // Get chat history with roles
        const chatHistory = (context._chatHistory as ChatMessageWithRole[]) || [];

        // Build messages with proper roles from history
        const messages: CoreMessage[] = [
            { role: 'system', content: systemPrompt },
            ...chatHistory.map(msg => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
            })),
            { role: 'user', content: userPrompt },
        ];

        const result = await step.ai.wrap(
            `openai-chat-model-generate-text-${nodeId}`,
            generateText,
            {
                model: openai(data.model || "gpt-4o-mini"),
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
            openAIChatModelChannel().status({
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
            openAIChatModelChannel().status({
                nodeId,
                status: "error",
            }),
        );

        throw new NonRetriableError("OpenAI Chat Model Node: OpenAI execution failed", {
            cause: error,
        });
    }
};
