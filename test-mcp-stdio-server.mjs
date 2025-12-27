#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";

const BASE_DIR = process.cwd();

// Create MCP server
const server = new McpServer({
    name: "test-mcp-server",
    version: "1.0.0",
});

// Register tools with Zod schemas for proper validation
server.tool(
    "read_file",
    "Read the contents of a file",
    {
        path: z.string().describe("Path to the file to read"),
    },
    async ({ path: filePath }) => {
        const fullPath = path.join(BASE_DIR, String(filePath));

        if (!fs.existsSync(fullPath)) {
            return {
                content: [{ type: "text", text: `Error: File not found: ${filePath}` }],
                isError: true,
            };
        }

        const content = fs.readFileSync(fullPath, "utf-8");
        return {
            content: [{ type: "text", text: content }],
        };
    }
);

server.tool(
    "list_files",
    "List files in the current directory",
    {},
    async () => {
        const files = fs.readdirSync(BASE_DIR);
        return {
            content: [{ type: "text", text: JSON.stringify(files, null, 2) }],
        };
    }
);

server.tool(
    "write_file",
    "Write content to a file",
    {
        path: z.string().describe("Path to the file to write"),
        content: z.string().describe("Content to write to the file"),
    },
    async ({ path: filePath, content }) => {
        const fullPath = path.join(BASE_DIR, String(filePath));
        fs.writeFileSync(fullPath, String(content), "utf-8");
        return {
            content: [{ type: "text", text: `Successfully wrote to ${filePath}` }],
        };
    }
);

// Connect to stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
