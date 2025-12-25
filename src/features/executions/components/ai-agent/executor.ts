import type { NodeExecutor, WorkflowContext } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { aiAgentChannel } from "@/inngest/channels/ai-agent";
import prisma from "@/lib/db";
import { AIProvider, DATABASE, NodeType } from "@/generated/prisma";
import { getExecutor } from "../../lib/executor-registry";
import Handlebars from "handlebars";

type AiAgentData = {
    variableName?: string;
}

const AI_MODEL_NODE_TYPES = [
    NodeType.OPENAI_CHAT_MODEL,
    NodeType.ANTHROPIC_CHAT_MODEL,
    NodeType.GEMINI_CHAT_MODEL,
    NodeType.OPENROUTER_CHAT_MODEL,
];

const DATABASE_NODE_TYPES = [
    NodeType.POSTGRES,
    NodeType.MONGODB,
];

// Chat message with role for proper conversation history
type ChatMessageWithRole = {
    role: 'user' | 'assistant';
    content: string;
}

/**
 * AI Agent Executor - Orchestrates execution of connected child nodes
 * 
 * Flow:
 * 1. Find connected model and database nodes
 * 2. If database connected: Query chat history
 * 3. If database connected: Save user prompt with role 'user'
 * 4. Call chat model executor to generate response
 * 5. If database connected: Save AI response with role 'assistant'
 * 6. Return combined result
 */
export const aiAgentExecutor: NodeExecutor<AiAgentData> = async ({ data, nodeId, userId, context, step, publish }) => {
    await publish(
        aiAgentChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    try {
        if (!data.variableName) {
            throw new NonRetriableError("AI Agent Node: Variable name is required");
        }

        const connectedNodes = await step.run("find-connected-nodes", async () => {
            const thisNode = await prisma.node.findUnique({
                where: { id: nodeId },
                select: { workflowId: true }
            });

            if (!thisNode) return null;

            const incomingConnections = await prisma.connection.findMany({
                where: {
                    workflowId: thisNode.workflowId,
                    toNodeId: nodeId,
                },
                select: {
                    fromNodeId: true,
                    toInput: true,
                }
            });

            const sourceNodeIds = incomingConnections.map(c => c.fromNodeId);
            const sourceNodes = await prisma.node.findMany({
                where: {
                    id: { in: sourceNodeIds }
                },
                select: {
                    id: true,
                    type: true,
                    data: true,
                }
            });

            const connectionMap: Record<string, typeof sourceNodes[0]> = {};
            for (const conn of incomingConnections) {
                const sourceNode = sourceNodes.find(n => n.id === conn.fromNodeId);
                if (sourceNode) {
                    connectionMap[conn.toInput || 'default'] = sourceNode;
                }
            }

            return { connectionMap, workflowId: thisNode.workflowId };
        });

        if (!connectedNodes) {
            throw new NonRetriableError("AI Agent Node: Could not find workflow");
        }

        const { connectionMap, workflowId } = connectedNodes;

        type ConnectedNode = { id: string; type: string; data: unknown };

        let foundModelNode: ConnectedNode | undefined = connectionMap['ai-model'] as ConnectedNode | undefined;
        if (!foundModelNode) {
            const allConnectedNodes = Object.values(connectionMap) as ConnectedNode[];
            foundModelNode = allConnectedNodes.find(n =>
                AI_MODEL_NODE_TYPES.includes(n.type as AIProvider)
            );
        }

        if (!foundModelNode) {
            throw new NonRetriableError("AI Agent Node: No AI Model node connected. Connect a Chat Model node.");
        }

        const modelNode: ConnectedNode = foundModelNode;

        let databaseNode: ConnectedNode | undefined = connectionMap['database'] as ConnectedNode | undefined;
        if (!databaseNode) {
            const allConnectedNodes = Object.values(connectionMap) as ConnectedNode[];
            databaseNode = allConnectedNodes.find(n =>
                DATABASE_NODE_TYPES.includes(n.type as DATABASE)
            );
        }

        let chatHistory: ChatMessageWithRole[] = [];
        let updatedContext: WorkflowContext = {
            ...context,
            _workflowId: workflowId,
            _agentNodeId: nodeId,
        };

        // Get the user prompt from the chat model node for saving
        const modelData = modelNode.data as Record<string, unknown>;
        const userPromptTemplate = modelData.userPrompt as string || '';
        const userPrompt = userPromptTemplate ? Handlebars.compile(userPromptTemplate)(context) : '';

        // Step 1: Query existing chat history
        if (databaseNode) {
            if (databaseNode.type === NodeType.POSTGRES) {
                const postgresExecutor = getExecutor(NodeType.POSTGRES);

                updatedContext = await postgresExecutor({
                    data: databaseNode.data as Record<string, unknown>,
                    nodeId: databaseNode.id,
                    userId,
                    context: {
                        ...updatedContext,
                        _postgresOperation: 'query',
                    },
                    step,
                    publish,
                });

                const postgresResult = updatedContext._postgresResult as { chatHistory: ChatMessageWithRole[] } | undefined;
                if (postgresResult?.chatHistory) {
                    chatHistory = postgresResult.chatHistory;
                }
            } else if (databaseNode.type === NodeType.MONGODB) {
                const mongodbExecutor = getExecutor(NodeType.MONGODB);

                updatedContext = await mongodbExecutor({
                    data: databaseNode.data as Record<string, unknown>,
                    nodeId: databaseNode.id,
                    userId,
                    context: {
                        ...updatedContext,
                        _mongodbOperation: 'query',
                    },
                    step,
                    publish,
                });

                const mongodbResult = updatedContext._mongodbResult as { chatHistory: ChatMessageWithRole[] } | undefined;
                if (mongodbResult?.chatHistory) {
                    chatHistory = mongodbResult.chatHistory;
                }
            }
        }

        // Step 2: Save user prompt to database (before AI response)
        if (databaseNode && userPrompt) {
            if (databaseNode.type === NodeType.POSTGRES) {
                const postgresExecutor = getExecutor(NodeType.POSTGRES);

                updatedContext = await postgresExecutor({
                    data: databaseNode.data as Record<string, unknown>,
                    nodeId: databaseNode.id,
                    userId,
                    context: {
                        ...updatedContext,
                        _postgresOperation: 'save',
                        _messageToSave: userPrompt,
                        _messageRole: 'user',
                    },
                    step,
                    publish,
                });
            } else if (databaseNode.type === NodeType.MONGODB) {
                const mongodbExecutor = getExecutor(NodeType.MONGODB);

                updatedContext = await mongodbExecutor({
                    data: databaseNode.data as Record<string, unknown>,
                    nodeId: databaseNode.id,
                    userId,
                    context: {
                        ...updatedContext,
                        _mongodbOperation: 'save',
                        _messageToSave: userPrompt,
                        _messageRole: 'user',
                    },
                    step,
                    publish,
                });
            }
        }

        // Step 3: Call chat model executor
        const chatModelExecutor = getExecutor(modelNode.type as NodeType);

        updatedContext = await chatModelExecutor({
            data: modelNode.data as Record<string, unknown>,
            nodeId: modelNode.id,
            userId,
            context: {
                ...updatedContext,
                _chatHistory: chatHistory,
            },
            step,
            publish,
        });

        const response = updatedContext._chatModelResponse as string || '';

        const postgresQueryResult = updatedContext._postgresResult as { chatHistory: ChatMessageWithRole[]; saved: boolean; tableName: string } | undefined;
        const mongodbQueryResult = updatedContext._mongodbResult as { chatHistory: ChatMessageWithRole[]; saved: boolean; collectionName: string } | undefined;

        // Step 4: Save AI response to database
        if (databaseNode && response) {
            if (databaseNode.type === NodeType.POSTGRES) {
                const postgresExecutor = getExecutor(NodeType.POSTGRES);

                updatedContext = await postgresExecutor({
                    data: databaseNode.data as Record<string, unknown>,
                    nodeId: databaseNode.id,
                    userId,
                    context: {
                        ...updatedContext,
                        _postgresOperation: 'save',
                        _messageToSave: response,
                        _messageRole: 'assistant',
                    },
                    step,
                    publish,
                });
            } else if (databaseNode.type === NodeType.MONGODB) {
                const mongodbExecutor = getExecutor(NodeType.MONGODB);

                updatedContext = await mongodbExecutor({
                    data: databaseNode.data as Record<string, unknown>,
                    nodeId: databaseNode.id,
                    userId,
                    context: {
                        ...updatedContext,
                        _mongodbOperation: 'save',
                        _messageToSave: response,
                        _messageRole: 'assistant',
                    },
                    step,
                    publish,
                });
            }
        }

        // Capture database results from save operation
        const postgresSaveResult = updatedContext._postgresResult as { chatHistory: ChatMessageWithRole[]; saved: boolean; tableName: string } | undefined;
        const mongodbSaveResult = updatedContext._mongodbResult as { chatHistory: ChatMessageWithRole[]; saved: boolean; collectionName: string } | undefined;

        await publish(
            aiAgentChannel().status({
                nodeId,
                status: "success",
            }),
        );

        // Build the agent result object with all child executor results nested inside
        const agentResult: Record<string, unknown> = {
            response: response,
            model: (modelNode.data as Record<string, unknown>).model,
            provider: modelNode.type,
            chatHistoryLength: chatHistory.length,
        };

        if (postgresQueryResult || postgresSaveResult) {
            agentResult.postgresResult = {
                chatHistory: postgresQueryResult?.chatHistory || [],
                saved: postgresSaveResult?.saved || false,
                tableName: postgresQueryResult?.tableName || postgresSaveResult?.tableName || '',
            };
        }

        if (mongodbQueryResult || mongodbSaveResult) {
            agentResult.mongodbResult = {
                chatHistory: mongodbQueryResult?.chatHistory || [],
                saved: mongodbSaveResult?.saved || false,
                collectionName: mongodbQueryResult?.collectionName || mongodbSaveResult?.collectionName || '',
            };
        }

        // Clean up internal context fields and return result
        return {
            ...updatedContext,
            [data.variableName]: agentResult,
            _workflowId: undefined,
            _agentNodeId: undefined,
            _chatHistory: undefined,
            _chatModelResponse: undefined,
            _postgresOperation: undefined,
            _mongodbOperation: undefined,
            _messageToSave: undefined,
            _messageRole: undefined,
            _postgresResult: undefined,
            _mongodbResult: undefined,
        };

    } catch (error) {
        await publish(
            aiAgentChannel().status({
                nodeId,
                status: "error",
            }),
        );

        if (error instanceof NonRetriableError) {
            throw error;
        }

        throw new NonRetriableError("AI Agent Node: Agent execution failed", {
            cause: error,
        });
    }
};
