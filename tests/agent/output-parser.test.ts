import { describe, it, expect, vi } from "vitest";
import { createOutputParser, OutputParseError } from "@/features/executions/components/ai-agent/agent/output-parser";
import { z } from "zod";

const testSchema = z.object({
  name: z.string(),
  age: z.number(),
  active: z.boolean().optional(),
});

describe("createOutputParser", () => {
  describe("non-strict mode (default)", () => {
    const parser = createOutputParser(testSchema);

    it("parses clean JSON successfully", () => {
      const result = parser.parse('{"name": "Alice", "age": 30}');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Alice");
        expect(result.data.age).toBe(30);
      }
    });

    it("extracts JSON from markdown code fences", () => {
      const text = 'Here is the result:\n```json\n{"name": "Bob", "age": 25}\n```\nDone!';
      const result = parser.parse(text);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Bob");
        expect(result.data.age).toBe(25);
      }
    });

    it("extracts JSON from plain code fences", () => {
      const text = '```\n{"name": "Charlie", "age": 35, "active": true}\n```';
      const result = parser.parse(text);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.active).toBe(true);
      }
    });

    it("extracts embedded JSON from surrounding text", () => {
      const text = 'The answer is {"name": "Dana", "age": 28} and that is final.';
      const result = parser.parse(text);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Dana");
      }
    });

    it("returns failure for no JSON content (fail-soft)", () => {
      const result = parser.parse("This is just plain text with no JSON.");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.raw).toBe("This is just plain text with no JSON.");
        expect(result.error).toContain("No valid JSON");
      }
    });

    it("returns failure for invalid JSON syntax (fail-soft)", () => {
      const result = parser.parse('{"name": "Eve", age: 30}');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });

    it("returns failure for schema validation errors (fail-soft)", () => {
      const result = parser.parse('{"name": 123, "age": "not a number"}');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Schema validation failed");
      }
    });

    it("does NOT throw in non-strict mode", () => {
      expect(() => parser.parse("invalid")).not.toThrow();
    });
  });

  describe("strict mode", () => {
    const strictParser = createOutputParser(testSchema, true);

    it("parses valid JSON successfully", () => {
      const result = strictParser.parse('{"name": "Frank", "age": 40}');
      expect(result.success).toBe(true);
    });

    it("throws OutputParseError for no JSON", () => {
      expect(() => strictParser.parse("just text")).toThrow(OutputParseError);
    });

    it("throws OutputParseError for schema validation failure", () => {
      expect(() =>
        strictParser.parse('{"name": 123, "age": "wrong"}'),
      ).toThrow(OutputParseError);
    });
  });

  describe("getFormatInstructions", () => {
    it("returns non-empty instructions", () => {
      const parser = createOutputParser(testSchema);
      const instructions = parser.getFormatInstructions();
      expect(instructions).toContain("JSON");
      expect(instructions.length).toBeGreaterThan(0);
    });
  });
});
