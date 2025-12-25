import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { mongodbChannel } from "@/inngest/channels/mongodb";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { MongoClient, Db, Collection, Document } from "mongodb";

type MongoDBNodeData = {
    credentialId?: string;
    database?: string;
    collectionName?: string;
    contextWindow?: string;
}

// TOON format: Token-Optimized Object Notation
type ChatMessage = string;

interface ChatHistoryDocument extends Document {
    workflowId: string;
    nodeId: string;
    content: string;
    createdAt: Date;
}

/**
 * Ensures the chat history collection exists with proper indexes
 */
async function ensureChatHistoryCollection(db: Db, collectionName: string): Promise<Collection<ChatHistoryDocument>> {
    const collection = db.collection<ChatHistoryDocument>(collectionName);

    // Create index for efficient lookups
    await collection.createIndex(
        { workflowId: 1, nodeId: 1, createdAt: -1 },
        { background: true }
    );

    return collection;
}

/**
 * Retrieves chat history from the database
 */
async function getChatHistory(
    collection: Collection<ChatHistoryDocument>,
    workflowId: string,
    agentNodeId: string,
    limit: number
): Promise<ChatMessage[]> {
    const results = await collection
        .find({ workflowId, nodeId: agentNodeId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

    return results.reverse().map(doc => doc.content);
}

/**
 * Saves a chat message to the database
 */
async function saveChatMessage(
    collection: Collection<ChatHistoryDocument>,
    workflowId: string,
    agentNodeId: string,
    content: string
): Promise<void> {
    await collection.insertOne({
        workflowId,
        nodeId: agentNodeId,
        content,
        createdAt: new Date(),
    });
}

/**
 * MongoDB executor for chat history operations.
 * 
 * When called by AI Agent, it can:
 * 1. Query chat history (when context._mongodbOperation === 'query')
 * 2. Save a message (when context._mongodbOperation === 'save')
 */
export const mongodbExecutor: NodeExecutor<MongoDBNodeData> = async ({ data, nodeId, userId, context, step, publish }) => {
    await publish(
        mongodbChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    if (!data.credentialId) {
        await publish(mongodbChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("MongoDB Node: Credential is required");
    }

    if (!data.database) {
        await publish(mongodbChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("MongoDB Node: Database is required");
    }

    const credential = await step.run("get-mongodb-credential", async () => {
        return prisma.credential.findUnique({
            where: { id: data.credentialId, userId },
        });
    });

    if (!credential) {
        await publish(mongodbChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("MongoDB Node: Credential not found");
    }

    const collectionName = data.collectionName || 'nodebase_chat_histories';
    const contextWindow = parseInt(data.contextWindow || '20', 10);

    const workflowId = context._workflowId as string || '';
    const agentNodeId = context._agentNodeId as string || nodeId;
    const operation = context._mongodbOperation as string || 'query';
    const messageToSave = context._messageToSave as string || '';

    try {
        // Use unique step name based on operation to avoid Inngest memoization
        const stepName = `mongodb-${operation}-${nodeId}`;
        const result = await step.run(stepName, async () => {
            const connectionString = decrypt(credential.value);

            const client = new MongoClient(connectionString, {
                serverSelectionTimeoutMS: 10000,
                connectTimeoutMS: 10000,
            });
            await client.connect();

            try {
                const db = client.db(data.database);
                const collection = await ensureChatHistoryCollection(db, collectionName);

                if (operation === 'save' && messageToSave) {
                    await saveChatMessage(collection, workflowId, agentNodeId, messageToSave);
                    return { saved: true, chatHistory: [] };
                } else {
                    const history = await getChatHistory(collection, workflowId, agentNodeId, contextWindow);
                    return { saved: false, chatHistory: history };
                }
            } finally {
                await client.close();
            }
        });

        await publish(
            mongodbChannel().status({
                nodeId,
                status: "success",
            }),
        );

        return {
            ...context,
            _mongodbResult: {
                chatHistory: result.chatHistory,
                saved: result.saved,
                collectionName,
            },
            _mongodbOperation: undefined,
            _messageToSave: undefined,
        };

    } catch (error) {
        await publish(
            mongodbChannel().status({
                nodeId,
                status: "error",
            }),
        );

        throw new NonRetriableError("MongoDB Node: Operation failed", {
            cause: error,
        });
    }
};
