import type { ZodType } from "zod";
import type { ParseResult } from "./types";

/**
 * Extracts JSON from LLM response text.
 * Handles common patterns: bare JSON, markdown ```json fences, and
 * JSON embedded within surrounding prose.
 */
function extractJson(text: string): string | null {
  // Try markdown code fence first: ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  // Try to find a JSON object or array in the text
  const jsonPatterns = [
    // Object: { ... }
    /(\{[\s\S]*\})/,
    // Array: [ ... ]
    /(\[[\s\S]*\])/,
  ];

  for (const pattern of jsonPatterns) {
    const match = text.match(pattern);
    if (match) {
      // Verify it actually parses
      try {
        JSON.parse(match[1]);
        return match[1];
      } catch {
        continue;
      }
    }
  }

  // Try the whole text as JSON
  try {
    JSON.parse(text.trim());
    return text.trim();
  } catch {
    return null;
  }
}

export class OutputParseError extends Error {
  constructor(
    message: string,
    public readonly raw: string,
  ) {
    super(message);
    this.name = "OutputParseError";
  }
}

/**
 * Creates a structured output parser backed by a Zod schema.
 *
 * Default behavior is fail-soft: returns { success: false, raw, error }
 * when parsing fails. Set `strict: true` to throw OutputParseError instead.
 */
export function createOutputParser<T>(schema: ZodType<T>, strict = false) {
  return {
    /**
     * Parses LLM response text into structured output.
     *
     * Fail-soft (default): never throws, returns ParseResult.
     * Strict mode: throws OutputParseError on failure.
     */
    parse(text: string): ParseResult<T> {
      const jsonStr = extractJson(text);
      if (!jsonStr) {
        const error = "No valid JSON found in response";
        if (strict) throw new OutputParseError(error, text);
        return { success: false, raw: text, error };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        const error = `JSON parse error: ${e instanceof Error ? e.message : String(e)}`;
        if (strict) throw new OutputParseError(error, text);
        return { success: false, raw: text, error };
      }

      const result = schema.safeParse(parsed);
      if (!result.success) {
        const zodError =
          "issues" in result.error
            ? (result.error.issues as Array<{ message: string }>)
                .map((i) => i.message)
                .join("; ")
            : String(result.error);
        const error = `Schema validation failed: ${zodError}`;
        if (strict) throw new OutputParseError(error, text);
        return { success: false, raw: text, error };
      }

      return { success: true, data: result.data as T };
    },

    /**
     * Generates format instructions for the system prompt.
     * Tells the LLM to respond with JSON matching the schema shape.
     */
    getFormatInstructions(): string {
      return [
        "You must format your final answer as a JSON object.",
        "Wrap the JSON in ```json code fences.",
        "The JSON must conform to the following schema description:",
        `Schema: ${JSON.stringify(schema.description || "See tool parameter definitions")}`,
        "Do not include any other text outside the JSON code fence in your final response.",
      ].join("\n");
    },
  };
}
