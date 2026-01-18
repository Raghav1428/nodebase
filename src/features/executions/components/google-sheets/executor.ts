import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { googleSheetsChannel } from "@/inngest/channels/google-sheets";
import { createSpreadsheet, appendToSpreadsheet, objectsToSheetData } from "@/lib/google-sheets";
import Handlebars from "handlebars";

type GoogleSheetsNodeData = {
    variableName?: string;
    credentialId?: string;
    operation?: "create" | "append";
    spreadsheetTitle?: string;
    spreadsheetId?: string;
    dataVariable?: string;
};

// Helper to resolve template variables
function resolveVariable(template: string, context: Record<string, unknown>): string {
    if (!template) return "";
    try {
        const compiled = Handlebars.compile(template, { noEscape: true });
        return compiled(context);
    } catch {
        return template;
    }
}

// Helper to get nested value from context
function getNestedValue(context: Record<string, unknown>, path: string): unknown {
    const parts = path.replace(/\{\{|\}\}/g, "").trim().split(".");
    let value: unknown = context;
    for (const part of parts) {
        if (value && typeof value === "object" && part in value) {
            value = (value as Record<string, unknown>)[part];
        } else {
            return undefined;
        }
    }
    return value;
}

export const googleSheetsExecutor: NodeExecutor<GoogleSheetsNodeData> = async ({
    data,
    nodeId,
    userId,
    context,
    step,
    publish
}) => {
    await step.run(`publish-google-sheets-loading-${nodeId}`, async () => {
        await publish(
            googleSheetsChannel().status({
                nodeId,
                status: "loading",
            })
        );
    });

    if (!data.credentialId) {
        await publish(googleSheetsChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("Google Sheets Node: Credential is required");
    }

    if (!data.dataVariable) {
        await publish(googleSheetsChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("Google Sheets Node: Data variable is required");
    }

    try {
        const result = await step.run(`google-sheets-${data.operation}-${nodeId}`, async () => {
            // Get data from context
            console.log("Google Sheets - dataVariable:", data.dataVariable);
            console.log("Google Sheets - context keys:", Object.keys(context));

            // First try to get as a variable path from context
            let rawData = getNestedValue(context, data.dataVariable || "");

            // If not found, try Handlebars template resolution
            if (rawData === undefined && data.dataVariable) {
                const resolved = resolveVariable(data.dataVariable, context);
                // If resolved is different from input, it was a template
                if (resolved !== data.dataVariable) {
                    rawData = resolved;
                } else {
                    // Fallback: treat the input as literal text/data
                    rawData = data.dataVariable;
                }
            }

            console.log("Google Sheets - rawData:", JSON.stringify(rawData)?.slice(0, 500));

            // If rawData is a JSON string, try to parse it
            if (typeof rawData === "string") {
                try {
                    const parsed = JSON.parse(rawData);
                    if (typeof parsed === "object" || Array.isArray(parsed)) {
                        rawData = parsed;
                        console.log("Google Sheets - parsed JSON string into:", Array.isArray(parsed) ? "array" : "object");
                    }
                } catch {
                    // Not valid JSON, keep as string
                }
            }

            let sheetData: any[][];
            if (Array.isArray(rawData)) {
                if (rawData.length > 0 && typeof rawData[0] === "object" && !Array.isArray(rawData[0])) {
                    // Array of objects - convert to sheet format
                    sheetData = objectsToSheetData(rawData);
                } else if (rawData.length > 0 && Array.isArray(rawData[0])) {
                    // Already 2D array
                    sheetData = rawData;
                } else {
                    // Simple array of values - each item gets its own row
                    sheetData = rawData.map(item => [String(item)]);
                }
            } else if (typeof rawData === "object" && rawData !== null) {
                // Single object - convert to key-value pairs
                sheetData = Object.entries(rawData).map(([key, value]) => [
                    key,
                    typeof value === "object" ? JSON.stringify(value) : value
                ]);
            } else {
                // Fallback - single value (treat as string)
                sheetData = [[String(rawData || "")]];
            }

            if (data.operation === "append" && data.spreadsheetId) {
                const spreadsheetId = resolveVariable(data.spreadsheetId, context);
                return appendToSpreadsheet(
                    data.credentialId!,
                    userId,
                    spreadsheetId,
                    sheetData
                );
            } else {
                const title = resolveVariable(
                    data.spreadsheetTitle || `Workflow Data - ${new Date().toISOString()}`,
                    context
                );
                return createSpreadsheet(
                    data.credentialId!,
                    userId,
                    title,
                    sheetData
                );
            }
        });

        await step.run(`publish-google-sheets-success-${nodeId}`, async () => {
            await publish(
                googleSheetsChannel().status({
                    nodeId,
                    status: "success",
                })
            );
        });

        const variableName = data.variableName || "googleSheets";
        return {
            ...context,
            [variableName]: result,
        };

    } catch (error) {
        await step.run(`publish-google-sheets-error-${nodeId}`, async () => {
            await publish(
                googleSheetsChannel().status({
                    nodeId,
                    status: "error",
                })
            );
        });

        throw new NonRetriableError("Google Sheets Node: Operation failed", {
            cause: error,
        });
    }
};
