import { jsonSchema } from "ai";
import type { ToolDefinition, ToolMetadata, DEFAULT_TOOL_METADATA } from "../types";

/**
 * Central tool registry for the AI Agent.
 * Manages tool registration, lookup, and conversion to AI SDK format.
 */
export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  /**
   * Register a single tool. Throws if a tool with the same name already exists.
   */
  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Register multiple tools at once.
   */
  registerBulk(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Look up a tool by name. Returns undefined for unknown tools (no crash).
   */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all registered tool names.
   */
  getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get all registered tools as an array.
   */
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * List tools with their metadata (useful for diagnostics).
   */
  listTools(): Array<{ name: string; description: string; metadata: ToolMetadata }> {
    return this.getAll().map((t) => ({
      name: t.name,
      description: t.description,
      metadata: t.metadata,
    }));
  }

  /**
   * Returns the number of registered tools.
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * Converts all registered tools to AI SDK format for use with generateText().
   *
   * Uses AI SDK's jsonSchema() to pass raw JSON Schema directly, matching
   * the pattern established in native-mcp-tools.ts.
   */
  toAISDKTools(): Record<string, unknown> {
    const sdkTools: Record<string, unknown> = {};

    for (const tool of this.tools.values()) {
      // Convert Zod schema to JSON Schema representation for AI SDK
      // We use the Zod schema's built-in JSON Schema conversion
      let rawSchema: Record<string, unknown>;

      try {
        // Zod v4 has a toJSONSchema method, but we can also use
        // a simpler approach: describe the schema as a JSON Schema object
        if ("_def" in tool.parameters && tool.parameters._def) {
          const def = tool.parameters._def as unknown as Record<string, unknown>;
          if (def.typeName === "ZodObject" && def.shape) {
            const shape = (typeof def.shape === "function" ? def.shape() : def.shape) as Record<string, unknown>;
            const properties: Record<string, unknown> = {};
            const required: string[] = [];

            for (const [key, fieldSchema] of Object.entries(shape)) {
              const field = fieldSchema as { _def?: Record<string, unknown>; description?: string };
              const fieldDef = field?._def as Record<string, unknown> | undefined;
              const isOptional = fieldDef?.typeName === "ZodOptional";

              // Basic type inference from Zod
              const innerDef = isOptional
                ? ((fieldDef?.innerType as { _def?: Record<string, unknown> })?._def)
                : fieldDef;
              const typeName = innerDef?.typeName as string | undefined;

              const propSchema: Record<string, unknown> = {};
              switch (typeName) {
                case "ZodString":
                  propSchema.type = "string";
                  break;
                case "ZodNumber":
                  propSchema.type = "number";
                  break;
                case "ZodBoolean":
                  propSchema.type = "boolean";
                  break;
                case "ZodArray":
                  propSchema.type = "array";
                  break;
                default:
                  propSchema.type = "string";
              }

              if (field?.description) {
                propSchema.description = field.description;
              }

              properties[key] = propSchema;
              if (!isOptional) {
                required.push(key);
              }
            }

            rawSchema = { type: "object", properties };
            if (required.length > 0) {
              rawSchema.required = required;
            }
          } else {
            rawSchema = { type: "object", properties: {} };
          }
        } else {
          rawSchema = { type: "object", properties: {} };
        }
      } catch {
        rawSchema = { type: "object", properties: {} };
      }

      const schema = jsonSchema(rawSchema);
      sdkTools[tool.name] = {
        type: "function",
        description: tool.description,
        parameters: schema,
        inputSchema: schema,
      };
    }

    return sdkTools;
  }
}
