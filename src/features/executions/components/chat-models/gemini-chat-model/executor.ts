import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { generateText, CoreMessage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import Handlebars from "handlebars";
import { geminiChatModelChannel } from "@/inngest/channels/gemini-chat-model";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
    const jsonString = JSON.stringify(context);
    const safeString = new Handlebars.SafeString(jsonString);
    return safeString;
});

type GeminiChatModelNodeData = {
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

export const geminiChatModelExecutor: NodeExecutor<GeminiChatModelNodeData> = async ({ data, nodeId, userId, context, step, publish }) => {
    await publish(
        geminiChatModelChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    if (!data.credentialId) {
        await publish(geminiChatModelChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("Gemini Chat Model Node: Credential is required");
    }

    if (!data.userPrompt) {
        await publish(geminiChatModelChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("Gemini Chat Model Node: User prompt is required");
    }

    const systemPrompt = data.systemPrompt ? Handlebars.compile(data.systemPrompt)(context) : "You are a helpful assistant.";
    const userPrompt = Handlebars.compile(data.userPrompt)(context);

    const credential = await step.run(`get-gemini-credential-${nodeId}`, () => {
        return prisma.credential.findUnique({
            where: { id: data.credentialId, userId },
        })
    });

    if (!credential) {
        await publish(geminiChatModelChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("Gemini Chat Model Node: Credential not found");
    }

    const google = createGoogleGenerativeAI({
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
            `gemini-chat-model-generate-text-${nodeId}`,
            generateText,
            {
                model: google(data.model || "gemini-2.0-flash"),
                messages,
                experimental_telemetry: {
                    isEnabled: true,
                    recordInputs: true,
                    recordOutputs: true,
                },
            },
        );

        const text = result?.steps?.[0]?.content?.[0]?.type === "text" ? result.steps[0].content[0].text : "";

        await publish(
            geminiChatModelChannel().status({
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
            geminiChatModelChannel().status({
                nodeId,
                status: "error",
            }),
        );

        throw new NonRetriableError("Gemini Chat Model Node: Gemini execution failed", {
            cause: error,
        });
    }
};
