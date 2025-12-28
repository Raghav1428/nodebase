import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { generateText, CoreMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import Handlebars from "handlebars";
import { openAIChatModelChannel } from "@/inngest/channels/openai-chat-model";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { createNativeMcpTools, type McpToolsConfig } from "@/features/executions/tools/mcp-tools/native-mcp-tools";

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

// MCP Tools config from AI Agent
type McpToolsNodeConfig = {
    transportType?: 'sse' | 'stdio' | 'http';
    serverUrl?: string;
    command?: string;
    args?: string;
}

export const openAIChatModelExecutor: NodeExecutor<OpenAIChatModelNodeData> = async ({ data, nodeId, userId, context, step, publish }) => {
    await step.run(`publish-openai-loading-${nodeId}`, async () => {
        await publish(
            openAIChatModelChannel().status({
                nodeId,
                status: "loading",
            }),
        );
    });

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
            model: openai(data.model || "gpt-4o-mini"),
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

        const result = await generateText(generateTextOptions);

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

        await step.run(`publish-openai-success-${nodeId}`, async () => {
            await publish(
                openAIChatModelChannel().status({
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

        // Use unique step ID for publish
        await step.run(`publish-openai-error-${nodeId}`, async () => {
            await publish(
                openAIChatModelChannel().status({
                    nodeId,
                    status: "error",
                }),
            );
        });

        throw new NonRetriableError("OpenAI Chat Model Node: OpenAI execution failed", {
            cause: error,
        });
    }
};
