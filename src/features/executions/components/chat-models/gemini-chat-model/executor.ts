import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { generateText, type ModelMessage } from "ai";
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

// MCP Tools config from AI Agent
type McpToolsNodeConfig = {
    transportType?: 'sse' | 'stdio' | 'http';
    serverUrl?: string;
    command?: string;
    args?: string;
}

export const geminiChatModelExecutor: NodeExecutor<GeminiChatModelNodeData> = async ({ data, nodeId, userId, context, step, publish }) => {
    // When called from agent loop, skip step.run wrappers to avoid HTTP round-trip overhead
    const isAgentLoop = !!context._agentIteration;

    // Publish loading status
    const publishLoading = async () => {
        await publish(
            geminiChatModelChannel().status({
                nodeId,
                status: "loading",
            }),
        );
    };
    if (isAgentLoop) {
        await publishLoading();
    } else {
        await step.run(`publish-gemini-loading-${nodeId}`, publishLoading);
    }

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

    // Fetch credential — skip step.run in agent loop
    let credential;
    if (isAgentLoop) {
        credential = await prisma.credential.findUnique({
            where: { id: data.credentialId, userId },
        });
    } else {
        credential = await step.run(`get-gemini-credential-${nodeId}`, () => {
            return prisma.credential.findUnique({
                where: { id: data.credentialId, userId },
            });
        });
    }

    if (!credential) {
        await publish(geminiChatModelChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("Gemini Chat Model Node: Credential not found");
    }

    const google = createGoogleGenerativeAI({
        apiKey: decrypt(credential.value),
    });

    try {
        // Get messages directly from AI Agent if provided, else build them locally
        let messages: ModelMessage[] = [];
        if (context._agentMessages && Array.isArray(context._agentMessages)) {
            messages = [
                { role: 'system', content: systemPrompt },
                ...(context._agentMessages as ModelMessage[]),
            ];
        } else {
            const chatHistory = (context._chatHistory as ChatMessageWithRole[]) || [];
            messages = [
                { role: 'system', content: systemPrompt },
                ...chatHistory.map(msg => ({
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content,
                }) as ModelMessage),
                { role: 'user', content: userPrompt },
            ];
        }

        // Get tools directly from AI Agent if provided
        const mcpTools = context._agentTools as Record<string, unknown> | undefined;

        // Build generateText options
        const generateTextOptions: Parameters<typeof generateText>[0] = {
            model: google(data.model || "gemini-2.0-flash"),
            messages,
            experimental_telemetry: {
                isEnabled: true,
                recordInputs: true,
                recordOutputs: true,
            },
        };

        // Add tools if available
        if (mcpTools && Object.keys(mcpTools).length > 0) {
            (generateTextOptions as any).tools = mcpTools;
        }

        const result = await generateText(generateTextOptions);
        const text = result?.text ?? '';
        const toolCalls = result?.toolCalls ?? [];

        // Publish success status
        const publishSuccess = async () => {
            await publish(
                geminiChatModelChannel().status({
                    nodeId,
                    status: "success",
                }),
            );
        };
        if (isAgentLoop) {
            await publishSuccess();
        } else {
            await step.run(`publish-gemini-success-${nodeId}`, publishSuccess);
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
                geminiChatModelChannel().status({
                    nodeId,
                    status: "error",
                }),
            );
        };
        if (isAgentLoop) {
            await publishError();
        } else {
            await step.run(`publish-gemini-error-${nodeId}`, publishError);
        }

        throw new NonRetriableError("Gemini Chat Model Node: Gemini execution failed", {
            cause: error,
        });
    }
};
