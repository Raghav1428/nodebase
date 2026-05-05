import type {
  AgentConfig,
  AgentMessage,
  AgentResult,
  ChatMessageWithRole,
  ConnectedNode,
  OrchestratorDeps,
  RawToolCall,
} from "./types";
import { DEFAULT_AGENT_CONFIG } from "./types";
import { ToolRegistry } from "./tools/registry";
import { loadMcpTools, type McpLoadResult } from "./tools/mcp-adapter";
import { createDbTools } from "./tools/db-tools";
import { loadChatHistory, saveMessage } from "./memory/store";
import { trimMessages } from "./memory/trim";
import { createActionRequests } from "./engine/create-action-requests";
import { executeActions } from "./engine/execute-actions";
import { createOutputParser } from "./output-parser";
import { aiAgentChannel } from "@/inngest/channels/ai-agent";
import Handlebars from "handlebars";
import type { McpToolsData } from "@/features/executions/tools/mcp-tools/executor";
import type { NodeType } from "@/generated/prisma";

/**
 * AI Agent Orchestrator — the heart of the ReAct loop.
 *
 * Implements a bounded ReAct (Reason + Act) loop:
 * 1. Load chat history + trim to token budget
 * 2. Call chat model (with tools if available)
 * 3. If tool calls → validate → execute → feed observations back → repeat
 * 4. If final answer → optionally parse structured output → save → return
 * 5. If max iterations reached → return with limitReached flag
 *
 * Falls back to secondary model if primary model throws (when configured).
 */
export async function runAgent(
  config: AgentConfig,
  deps: OrchestratorDeps,
): Promise<{ result: AgentResult; updatedContext: Record<string, unknown> }> {
  const maxIterations = config.maxIterations || DEFAULT_AGENT_CONFIG.maxIterations;
  const tokenBudget = config.tokenBudget || DEFAULT_AGENT_CONFIG.tokenBudget;
  const trimStrategy = config.trimStrategy || DEFAULT_AGENT_CONFIG.trimStrategy;

  // Track state
  const toolsUsed = new Set<string>();
  let mcpLoadResult: McpLoadResult | undefined;
  let updatedContext = { ...deps.context };

  try {
    // -----------------------------------------------------------------------
    // Step 0: Build tool registry
    // -----------------------------------------------------------------------
    const registry = new ToolRegistry();

    // Load MCP tools if tools node is connected
    if (config.toolsNode) {
      mcpLoadResult = await loadMcpTools(config.toolsNode, deps);
      registry.registerBulk(mcpLoadResult.tools);
    }

    // Load DB tools if database node is connected
    if (config.databaseNode) {
      const dbTools = createDbTools(
        config.databaseNode,
        { workflowId: config.workflowId, agentNodeId: config.agentNodeId },
        deps,
      );
      registry.registerBulk(dbTools);
    }

    // -----------------------------------------------------------------------
    // Step 1: Load chat history and build initial messages
    // -----------------------------------------------------------------------
    let chatHistory: ChatMessageWithRole[] = [];

    if (config.databaseNode) {
      const historyResult = await loadChatHistory(
        config.databaseNode,
        { workflowId: config.workflowId, agentNodeId: config.agentNodeId },
        deps,
      );
      chatHistory = historyResult.chatHistory;
    }

    // Build user prompt from the model node's data
    const modelData = config.modelNode.data;
    const userPromptTemplate = (modelData.userPrompt as string) || "";
    const userPrompt = userPromptTemplate
      ? Handlebars.compile(userPromptTemplate)(deps.context)
      : "";

    // Build messages array
    let messages: AgentMessage[] = [
      ...chatHistory.map((msg) => ({ role: msg.role, content: msg.content })),
      { role: "user", content: userPrompt },
    ];

    // Trim messages to token budget
    messages = trimMessages(messages, tokenBudget, trimStrategy);

    // -----------------------------------------------------------------------
    // Step 2: Save the user prompt to DB
    // -----------------------------------------------------------------------
    if (config.databaseNode && userPrompt) {
      updatedContext = await saveMessage(
        config.databaseNode,
        userPrompt,
        "user",
        { workflowId: config.workflowId, agentNodeId: config.agentNodeId },
        { ...deps, context: updatedContext },
      );
    }

    // -----------------------------------------------------------------------
    // Step 3: ReAct loop
    // -----------------------------------------------------------------------
    let finalResponse = "";
    let iterations = 0;
    let limitReached = false;

    // Prepare AI SDK tools for generateText
    const aiSdkTools = registry.size > 0 ? registry.toAISDKTools() : undefined;

    // Use the tools already loaded by the registry — no need to re-invoke MCP executor.
    // The registry.toAISDKTools() produces the same format the chat model executors expect.
    let agentToolsForModel: Record<string, unknown> | undefined;
    if (aiSdkTools && Object.keys(aiSdkTools).length > 0) {
      agentToolsForModel = aiSdkTools;
    }

    while (iterations < maxIterations) {
      iterations++;

      // Publish iteration status (direct call, no step.run needed — idempotent event emit)
      await deps.publish(
        aiAgentChannel().status({
          nodeId: config.agentNodeId,
          status: "loading",
        }),
      );

      // Call the chat model executor
      let modelNode = config.modelNode;

      try {
        const chatModelExecutor = deps.getExecutor(modelNode.type);
        updatedContext = await chatModelExecutor({
          data: modelNode.data,
          nodeId: modelNode.id,
          userId: deps.userId,
          context: {
            ...updatedContext,
            _agentMessages: messages,
            _agentTools: agentToolsForModel,
            _agentIteration: iterations,
          },
          step: deps.step,
          publish: deps.publish,
        });
      } catch (primaryError) {
        // Fallback to secondary model if configured
        if (config.fallbackModelNode) {
          modelNode = config.fallbackModelNode;
          const fallbackExecutor = deps.getExecutor(modelNode.type);
          updatedContext = await fallbackExecutor({
            data: modelNode.data,
            nodeId: modelNode.id,
            userId: deps.userId,
            context: {
              ...updatedContext,
              _agentMessages: messages,
              _agentTools: agentToolsForModel,
              _agentIteration: iterations,
            },
            step: deps.step,
            publish: deps.publish,
          });
        } else {
          throw primaryError;
        }
      }

      const loopResponse = (updatedContext._chatModelResponse as string) || "";
      const loopToolCalls = updatedContext._chatModelToolCalls as
        | Array<{
            toolCallId?: string;
            id?: string;
            toolName?: string;
            name?: string;
            args?: Record<string, unknown>;
            arguments?: Record<string, unknown>;
            input?: Record<string, unknown>;
          }>
        | undefined;

      // -------------------------------------------------------------------
      // Tool calls detected — execute via engine
      // -------------------------------------------------------------------
      if (loopToolCalls && loopToolCalls.length > 0) {
        // Push assistant tool-call message into history.
        // CRITICAL: Use the SDK's response.messages when available — they include
        // provider-specific metadata (e.g. Gemini thought_signature) that is required
        // when replaying tool calls back to the model. Manually reconstructed messages
        // lose this metadata and cause API errors.
        const responseMessages = updatedContext._chatModelResponseMessages as
          | Array<{ role: string; content: unknown }>
          | undefined;

        // Find the assistant message from SDK response (contains tool-call parts with provider metadata)
        const sdkAssistantMsg = responseMessages?.find(
          (m) => m.role === "assistant"
        );

        if (sdkAssistantMsg) {
          // Use the SDK's pre-built assistant message (preserves thought_signature etc.)
          messages.push(sdkAssistantMsg as unknown as (typeof messages)[number]);
        } else {
          // Fallback: manually construct (works for providers that don't need extra metadata)
          messages.push({
            role: "assistant",
            content: [
              ...(loopResponse ? [{ type: "text" as const, text: loopResponse }] : []),
              ...loopToolCalls.map((t) => ({
                type: "tool-call" as const,
                toolCallId: (t.toolCallId || t.id) as string,
                toolName: (t.toolName || t.name) as string,
                input: t.args || t.arguments || t.input || {},
              })),
            ] as unknown,
          });
        }

        // Normalize raw tool calls
        const rawToolCalls: RawToolCall[] = loopToolCalls.map((t) => ({
          toolCallId: (t.toolCallId || t.id) as string,
          toolName: (t.toolName || t.name) as string,
          args: (t.args || t.arguments || t.input || {}) as Record<string, unknown>,
        }));

        // Create validated action requests
        const actionRequests = createActionRequests(rawToolCalls, registry);

        // Execute actions with retry policy
        const toolResults = await executeActions(actionRequests, registry, {
          onToolStart: (toolName) => {
            toolsUsed.add(toolName);
          },
        });

        // Push tool results as tool messages (AI SDK v5 ModelMessage format)
        // output must be LanguageModelV2ToolResultOutput:
        //   { type: 'text', value: string }
        //   { type: 'json', value: JSONValue }
        //   { type: 'error-text', value: string }
        //   { type: 'error-json', value: JSONValue }
        for (const toolResult of toolResults) {
          let outputObj: { type: string; value: unknown };

          if (toolResult.isError) {
            outputObj = { type: "error-text", value: String(toolResult.output) };
          } else {
            // Try to parse as JSON for structured output
            try {
              const parsed = JSON.parse(toolResult.output);
              outputObj = { type: "json", value: parsed };
            } catch {
              outputObj = { type: "text", value: toolResult.output };
            }
          }

          messages.push({
            role: "tool",
            content: [
              {
                type: "tool-result" as const,
                toolCallId: toolResult.toolCallId,
                toolName: toolResult.toolName,
                output: outputObj,
              },
            ] as unknown,
          });
        }

        // Re-trim messages if they've grown
        messages = trimMessages(messages, tokenBudget, trimStrategy);

        continue; // Next iteration
      }

      // -------------------------------------------------------------------
      // Final answer — no tool calls
      // -------------------------------------------------------------------
      if (loopResponse) {
        finalResponse = loopResponse;
        break;
      }
    }

    // If we exhausted iterations without a final answer
    if (!finalResponse && iterations >= maxIterations) {
      limitReached = true;
      finalResponse =
        "I've reached the maximum number of reasoning steps. " +
        "Based on what I've gathered so far, I wasn't able to formulate a complete answer. " +
        "Please try again with a more specific question or increase the iteration limit.";
    }

    // -----------------------------------------------------------------------
    // Step 4: Parse structured output (if configured)
    // -----------------------------------------------------------------------
    let structuredOutput: unknown;
    let parseError: string | undefined;

    if (config.outputSchema && finalResponse) {
      const parser = createOutputParser(
        config.outputSchema,
        config.outputParserStrict,
      );
      const parseResult = parser.parse(finalResponse);
      if (parseResult.success) {
        structuredOutput = parseResult.data;
      } else {
        parseError = parseResult.error;
        // In non-strict mode, we continue with the raw response
      }
    }

    // -----------------------------------------------------------------------
    // Step 5: Save final response to DB and cleanup
    // -----------------------------------------------------------------------
    if (config.databaseNode && finalResponse) {
      updatedContext = await saveMessage(
        config.databaseNode,
        finalResponse,
        "assistant",
        { workflowId: config.workflowId, agentNodeId: config.agentNodeId },
        { ...deps, context: updatedContext },
      );
    }

    // Cleanup MCP client
    if (mcpLoadResult?.cleanup) {
      try {
        await mcpLoadResult.cleanup();
      } catch {
        // Ignore cleanup errors
      }
    }

    // -----------------------------------------------------------------------
    // Build result
    // -----------------------------------------------------------------------
    const agentResult: AgentResult = {
      response: finalResponse,
      structuredOutput,
      parseError,
      model: config.modelNode.data.model as string | undefined,
      provider: config.modelNode.type,
      iterations,
      limitReached,
      toolsUsed: Array.from(toolsUsed),
      chatHistoryLength: chatHistory.length,
    };

    // Add MCP tools info
    if (mcpLoadResult) {
      agentResult.mcpTools = {
        available: true,
        toolNames: mcpLoadResult.toolNames,
        toolCount: mcpLoadResult.toolNames.length,
        transportType: mcpLoadResult.transportType,
      };
    }

    // Add DB result info
    if (config.databaseNode) {
      const postgresResult = updatedContext._postgresResult as Record<string, unknown> | undefined;
      const mongodbResult = updatedContext._mongodbResult as Record<string, unknown> | undefined;

      if (config.databaseNode.type === "POSTGRES" && postgresResult) {
        agentResult.postgresResult = {
          chatHistory: (postgresResult.chatHistory as ChatMessageWithRole[]) || [],
          saved: (postgresResult.saved as boolean) || false,
          tableName: (postgresResult.tableName as string) || "",
        };
      }

      if (config.databaseNode.type === "MONGODB" && mongodbResult) {
        agentResult.mongodbResult = {
          chatHistory: (mongodbResult.chatHistory as ChatMessageWithRole[]) || [],
          saved: (mongodbResult.saved as boolean) || false,
          collectionName: (mongodbResult.collectionName as string) || "",
        };
      }
    }

    return { result: agentResult, updatedContext };
  } catch (error) {
    // Cleanup MCP client on error
    if (mcpLoadResult?.cleanup) {
      try {
        await mcpLoadResult.cleanup();
      } catch {
        // Ignore
      }
    }
    throw error;
  }
}
