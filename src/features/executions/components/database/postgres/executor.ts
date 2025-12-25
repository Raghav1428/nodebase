import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { postgresChannel } from "@/inngest/channels/postgres";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { Client } from "pg";

type PostgresNodeData = {
    credentialId?: string;
    host?: string;
    port?: string;
    database?: string;
    tableName?: string;
    contextWindow?: string;
}

// TOON format: Token-Optimized Object Notation
type ChatMessage = string;

/**
 * Ensures the chat history table exists in the database
 */
async function ensureChatHistoryTable(client: Client, tableName: string): Promise<void> {
    await client.query(`
        CREATE TABLE IF NOT EXISTS ${tableName} (
            id SERIAL PRIMARY KEY,
            workflow_id TEXT NOT NULL,
            node_id TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${tableName}_lookup 
        ON ${tableName}(workflow_id, node_id, created_at DESC)
    `);
}

/**
 * Retrieves chat history from the database
 */
async function getChatHistory(
    client: Client,
    tableName: string,
    workflowId: string,
    agentNodeId: string,
    limit: number
): Promise<ChatMessage[]> {
    const result = await client.query(
        `SELECT content FROM ${tableName} 
         WHERE workflow_id = $1 AND node_id = $2 
         ORDER BY created_at DESC 
         LIMIT $3`,
        [workflowId, agentNodeId, limit]
    );

    return result.rows.reverse().map(row => row.content as string);
}

/**
 * Saves a chat message to the database
 */
async function saveChatMessage(
    client: Client,
    tableName: string,
    workflowId: string,
    agentNodeId: string,
    content: string
): Promise<void> {
    await client.query(
        `INSERT INTO ${tableName} (workflow_id, node_id, content) 
         VALUES ($1, $2, $3)`,
        [workflowId, agentNodeId, content]
    );
}

/**
 * PostgreSQL executor for chat history operations.
 * 
 * When called by AI Agent, it can:
 * 1. Query chat history (when context.postgresOperation === 'query')
 * 2. Save a message (when context.postgresOperation === 'save')
 */
export const postgresExecutor: NodeExecutor<PostgresNodeData> = async ({ data, nodeId, userId, context, step, publish }) => {
    await publish(
        postgresChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    if (!data.credentialId) {
        await publish(postgresChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("PostgreSQL Node: Credential is required");
    }

    if (!data.host) {
        await publish(postgresChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("PostgreSQL Node: Host is required");
    }

    const credential = await step.run("get-postgres-credential", async () => {
        return prisma.credential.findUnique({
            where: { id: data.credentialId, userId },
        });
    });

    if (!credential) {
        await publish(postgresChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("PostgreSQL Node: Credential not found");
    }

    const tableName = data.tableName || 'nodebase_chat_histories';
    const contextWindow = parseInt(data.contextWindow || '20', 10);

    const workflowId = context._workflowId as string || '';
    const agentNodeId = context._agentNodeId as string || nodeId;
    const operation = context._postgresOperation as string || 'query';
    const messageToSave = context._messageToSave as string || '';

    try {
        // Use unique step name based on operation to avoid Inngest memoization
        const stepName = `postgres-${operation}-${nodeId}`;
        const result = await step.run(stepName, async () => {
            const client = new Client({
                host: data.host || 'localhost',
                port: parseInt(data.port || '5432', 10),
                database: data.database || 'postgres',
                password: decrypt(credential.value),
                user: credential.name,
                ssl: { rejectUnauthorized: false },
            });
            await client.connect();

            try {
                await ensureChatHistoryTable(client, tableName);

                if (operation === 'save' && messageToSave) {
                    await saveChatMessage(client, tableName, workflowId, agentNodeId, messageToSave);
                    return { saved: true, chatHistory: [] };
                } else {
                    const history = await getChatHistory(client, tableName, workflowId, agentNodeId, contextWindow);
                    return { saved: false, chatHistory: history };
                }
            } finally {
                await client.end();
            }
        });

        await publish(
            postgresChannel().status({
                nodeId,
                status: "success",
            }),
        );

        return {
            ...context,
            _postgresResult: {
                chatHistory: result.chatHistory,
                saved: result.saved,
                tableName,
            },
            // Clean up internal context fields
            _postgresOperation: undefined,
            _messageToSave: undefined,
        };

    } catch (error) {
        await publish(
            postgresChannel().status({
                nodeId,
                status: "error",
            }),
        );

        throw new NonRetriableError("PostgreSQL Node: Operation failed", {
            cause: error,
        });
    }
};
