import type { ToolDefinition } from "./types";
import type { createOutputParser } from "./output-parser";

/**
 * Builds the ReAct-style system prompt for the AI Agent.
 *
 * Includes:
 * - Base agent instructions
 * - Available tool descriptions
 * - Structured output format instructions (if parser configured)
 */
export function buildSystemPrompt(options: {
  tools: ToolDefinition[];
  outputParser?: ReturnType<typeof createOutputParser>;
  systemPromptOverride?: string;
}): string {
  const { tools, outputParser, systemPromptOverride } = options;

  // If user provided a complete override, use it
  if (systemPromptOverride) {
    let prompt = systemPromptOverride;

    // Still append tool descriptions and output instructions
    if (tools.length > 0) {
      prompt += "\n\n" + buildToolSection(tools);
    }
    if (outputParser) {
      prompt += "\n\n" + outputParser.getFormatInstructions();
    }
    return prompt;
  }

  const sections: string[] = [];

  // Base instructions
  sections.push(
    "You are an AI agent that can use tools to accomplish tasks.",
    "Think step by step. When you need information or need to take action, use the available tools.",
    "After using tools and gathering enough information, provide a clear, comprehensive final answer.",
    "If you cannot accomplish the task, explain why clearly.",
  );

  // Tool descriptions
  if (tools.length > 0) {
    sections.push("", buildToolSection(tools));
  }

  // Iteration limit awareness
  sections.push(
    "",
    "Important: You have a limited number of iterations. Use tools efficiently.",
    "If you find yourself going in circles, stop and provide the best answer you have.",
  );

  // Structured output
  if (outputParser) {
    sections.push("", outputParser.getFormatInstructions());
  }

  return sections.join("\n");
}

/**
 * Builds the tool description section for the system prompt.
 */
function buildToolSection(tools: ToolDefinition[]): string {
  const lines = ["Available tools:"];
  for (const tool of tools) {
    lines.push(`- ${tool.name}: ${tool.description}`);
  }
  return lines.join("\n");
}
