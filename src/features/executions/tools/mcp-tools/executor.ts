import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars";
import { mcpToolsChannel } from "@/inngest/channels/mcp-tools";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

Handlebars.registerHelper("json", (context) => {
    const jsonString = JSON.stringify(context);
    const safeString = new Handlebars.SafeString(jsonString);
    return safeString;
});

type McpToolsData = {
    variableName?: string;
    serverUrl?: string;
    transportType?: "sse" | "stdio";
    toolName?: string;
    toolArguments?: string;
    command?: string;
    args?: string;
}

export const mcpToolsExecutor: NodeExecutor<McpToolsData> = async ({ data, nodeId, context, step, publish }) => {
    await publish(
        mcpToolsChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    if (!data.variableName) {
        await publish(
            mcpToolsChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("MCP Tools Node: Variable name is required");
    }

    if (!data.toolName) {
        await publish(
            mcpToolsChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("MCP Tools Node: Tool name is required");
    }

    const transportType = data.transportType || "sse";

    // Parse tool arguments with Handlebars
    let toolArgs: Record<string, unknown> = {};
    if (data.toolArguments) {
        try {
            const compiled = Handlebars.compile(data.toolArguments)(context);
            toolArgs = JSON.parse(compiled);
        } catch {
            toolArgs = {};
        }
    }

    try {
        const result = await step.run("execute-mcp-tool", async () => {
            const client = new Client({
                name: "nodebase-workflow",
                version: "1.0.0",
            });

            let transport;

            if (transportType === "sse" && data.serverUrl) {
                transport = new SSEClientTransport(new URL(data.serverUrl));
            } else if (transportType === "stdio" && data.command) {
                const args = data.args ? data.args.split(" ") : [];
                transport = new StdioClientTransport({
                    command: data.command,
                    args,
                });
            } else {
                throw new Error("Invalid transport configuration");
            }

            await client.connect(transport);

            try {
                const toolResult = await client.callTool({
                    name: data.toolName!,
                    arguments: toolArgs,
                });

                return toolResult;
            } finally {
                await client.close();
            }
        });

        await publish(
            mcpToolsChannel().status({
                nodeId,
                status: "success",
            }),
        );

        return {
            ...context,
            [data.variableName]: {
                toolResult: result,
            }
        };

    } catch (error) {
        await publish(
            mcpToolsChannel().status({
                nodeId,
                status: "error",
            }),
        );

        throw new NonRetriableError("MCP Tools Node: Tool execution failed", {
            cause: error,
        });
    }
};
