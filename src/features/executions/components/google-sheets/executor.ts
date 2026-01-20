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
        await step.run(`google-sheets-validation-error-credential-${nodeId}`, async () => {
            await publish(googleSheetsChannel().status({ nodeId, status: "error" }));
            throw new NonRetriableError("Google Sheets Node: Credential is required");
        });
    }

    if (!data.dataVariable) {
        await step.run(`google-sheets-validation-error-data-variable-${nodeId}`, async () => {
            await publish(googleSheetsChannel().status({ nodeId, status: "error" }));
            throw new NonRetriableError("Google Sheets Node: Data variable is required");
        });
    }

    try {
        const result = await step.run(`google-sheets-${data.operation}-${nodeId}`, async () => {
            let rawData = getNestedValue(context, data.dataVariable || "");
            if (rawData === undefined && data.dataVariable) {
                const resolved = resolveVariable(data.dataVariable, context);
                if (resolved !== data.dataVariable) {
                    rawData = resolved;
                } else {
                    rawData = data.dataVariable;
                }
            }

            if (typeof rawData === "string") {
                let stringData: string = rawData;
                // Check if the string contains markdown code fences
                const codeBlockMatch = stringData.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
                if (codeBlockMatch) {
                    stringData = codeBlockMatch[1].trim();
                }
                try {
                    const parsed = JSON.parse(stringData);
                    if (typeof parsed === "object" || Array.isArray(parsed)) {
                        rawData = parsed;
                    }
                } catch {
                    // Not valid JSON, keep as string
                }
            }

            let sheetData: any[][];
            if (Array.isArray(rawData)) {
                if (rawData.length > 0 && rawData[0] != null && typeof rawData[0] === "object" && !Array.isArray(rawData[0])) {
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

            if (data.operation === "append" && !data.spreadsheetId) {
                throw new NonRetriableError("Google Sheets Node: Spreadsheet ID is required for append operation");
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
