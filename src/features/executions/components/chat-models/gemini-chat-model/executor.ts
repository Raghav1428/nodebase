import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { generateText, CoreMessage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import Handlebars from "handlebars";
import { geminiChatModelChannel } from "@/inngest/channels/gemini-chat-model";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { createNativeMcpTools, type McpToolsConfig } from "@/features/executions/tools/mcp-tools/native-mcp-tools";

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
    await step.run(`publish-gemini-loading-${nodeId}`, async () => {
        await publish(
            geminiChatModelChannel().status({
                nodeId,
                status: "loading",
            }),
        );
    });

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

    // Track MCP cleanup function
    let mcpCleanup: (() => Promise<void>) | null = null;

    try {
        // Get chat history with roles
        const chatHistory = (context._chatHistory as ChatMessageWithRole[]) || [];

        // Get MCP tools config if available from AI Agent
        const mcpToolsConfig = context._mcpToolsConfig as McpToolsNodeConfig | undefined;

        // Create MCP tools if config provided
        let mcpTools: Record<string, unknown> | undefined;
        let mcpToolNames: string[] = [];

        if (mcpToolsConfig && (mcpToolsConfig.serverUrl || mcpToolsConfig.command)) {
            try {
                const config: McpToolsConfig = {
                    transportType: mcpToolsConfig.transportType || 'stdio',
                    serverUrl: mcpToolsConfig.serverUrl,
                    command: mcpToolsConfig.command,
                    args: mcpToolsConfig.args,
                };
                const result = await createNativeMcpTools(config);
                mcpTools = result.tools;
                mcpToolNames = result.toolNames || [];
                mcpCleanup = result.cleanup;
            } catch (error) {
                throw error;
            }
        }

        // Build messages with proper roles from history
        const messages: CoreMessage[] = [
            { role: 'system', content: systemPrompt },
            ...chatHistory.map(msg => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
            })),
            { role: 'user', content: userPrompt },
        ];

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
            (generateTextOptions as any).maxSteps = 5;
        }

        // Call generateText directly (not step.ai.wrap to avoid serialization issues with tool functions)
        const result = await generateText(generateTextOptions);

        // Extract text from result - if empty, try to get from tool results
        let text = result?.text ?? '';

        if (!text && result?.toolResults && result.toolResults.length > 0) {
            const toolResultTexts = result.toolResults.map((tr: unknown) => {
                const toolResult = tr as Record<string, unknown>;
                const res = toolResult.result ?? toolResult.output ?? toolResult.content ?? toolResult;
                if (typeof res === 'string') return res;
                if (res && typeof res === 'object') {
                    if ('content' in res) {
                        const content = (res as { content: Array<{ text?: string }> }).content;
                        if (Array.isArray(content)) {
                            return content.map(c => c.text || '').join('\n');
                        }
                    }
                    if ('text' in res) {
                        return (res as { text: string }).text;
                    }
                }
                return JSON.stringify(res);
            }).join('\n');
            text = toolResultTexts || text;
        }

        // Cleanup MCP client after generateText completes
        if (mcpCleanup) {
            try {
                await mcpCleanup();
            } catch (e) {
            }
        }

        // Use unique step ID for publish
        await step.run(`publish-gemini-success-${nodeId}`, async () => {
            await publish(
                geminiChatModelChannel().status({
                    nodeId,
                    status: "success",
                }),
            );
        });

        return {
            ...context,
            _chatModelResponse: text,
            _mcpToolNames: mcpToolNames.length > 0 ? mcpToolNames : undefined,
            _chatHistory: undefined,
        };

    } catch (error) {
        // Cleanup MCP client on error
        if (mcpCleanup) {
            try {
                await mcpCleanup();
            } catch (e) {
            }
        }

        await step.run(`publish-gemini-error-${nodeId}`, async () => {
            await publish(
                geminiChatModelChannel().status({
                    nodeId,
                    status: "error",
                }),
            );
        });

        throw new NonRetriableError("Gemini Chat Model Node: Gemini execution failed", {
            cause: error,
        });
    }
};
