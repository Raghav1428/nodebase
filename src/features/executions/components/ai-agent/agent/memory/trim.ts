import type { AgentMessage } from "../types";

/**
 * Estimates token count from text using word-count heuristic.
 * ~1.33 tokens per word is a reasonable cross-model average.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.ceil(wordCount * 1.33);
}

/**
 * Estimates total tokens across a message's content.
 * Handles string content, array content, and nested structures.
 */
function estimateMessageTokens(message: AgentMessage): number {
  if (!message.content) return 0;

  if (typeof message.content === "string") {
    return estimateTokens(message.content);
  }

  if (Array.isArray(message.content)) {
    let total = 0;
    for (const part of message.content) {
      if (typeof part === "string") {
        total += estimateTokens(part);
      } else if (typeof part === "object" && part !== null) {
        const obj = part as Record<string, unknown>;
        if (typeof obj.text === "string") {
          total += estimateTokens(obj.text);
        } else if (obj.output !== undefined) {
          total += estimateTokens(
            typeof obj.output === "string"
              ? obj.output
              : JSON.stringify(obj.output),
          );
        } else {
          total += estimateTokens(JSON.stringify(part));
        }
      }
    }
    return total;
  }

  return estimateTokens(JSON.stringify(message.content));
}

/**
 * Identifies the hard minimum preserved window:
 * - System prompt (first message if role === 'system')
 * - Last user message
 * - Last assistant message
 * - All tool messages from the latest tool-call cycle
 *
 * These messages are NEVER trimmed regardless of token budget.
 */
function getPreservedIndices(messages: AgentMessage[]): Set<number> {
  const preserved = new Set<number>();

  // System prompt is always index 0 if it exists
  if (messages.length > 0 && messages[0].role === "system") {
    preserved.add(0);
  }

  // Find last user message
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      preserved.add(i);
      break;
    }
  }

  // Find last assistant message
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      preserved.add(i);
      break;
    }
  }

  // Find latest tool-call cycle: walk backwards from end, collect consecutive tool messages
  // and the assistant message that triggered them
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "tool") {
      preserved.add(i);
    } else if (messages[i].role === "assistant" && preserved.has(i + 1)) {
      // This assistant message triggered the tool calls below it
      preserved.add(i);
      break;
    } else if (messages[i].role !== "tool") {
      break;
    }
  }

  return preserved;
}

/**
 * Trims messages to fit within a token budget.
 *
 * Strategy 'heuristic':
 *   Removes the oldest non-preserved messages first until total tokens
 *   fit within the budget. Preserved messages are NEVER removed.
 *
 * Strategy 'none':
 *   Returns messages unmodified (bypass trimming entirely).
 */
export function trimMessages(
  messages: AgentMessage[],
  tokenBudget: number,
  strategy: "heuristic" | "none" = "heuristic",
): AgentMessage[] {
  if (strategy === "none") {
    return messages;
  }

  if (messages.length === 0) {
    return [];
  }

  const preserved = getPreservedIndices(messages);

  // Calculate total tokens
  const tokenCounts = messages.map(estimateMessageTokens);
  let totalTokens = tokenCounts.reduce((sum, t) => sum + t, 0);

  if (totalTokens <= tokenBudget) {
    return messages;
  }

  // Build list of trimmable indices (non-preserved, oldest first)
  const trimmable: number[] = [];
  for (let i = 0; i < messages.length; i++) {
    if (!preserved.has(i)) {
      trimmable.push(i);
    }
  }

  // Remove oldest trimmable messages until we fit
  const removedIndices = new Set<number>();
  for (const idx of trimmable) {
    if (totalTokens <= tokenBudget) break;
    removedIndices.add(idx);
    totalTokens -= tokenCounts[idx];
  }

  return messages.filter((_, idx) => !removedIndices.has(idx));
}
