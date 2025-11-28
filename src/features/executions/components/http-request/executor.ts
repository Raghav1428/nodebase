import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import ky, { type Options as KyOptions } from "ky";

type HttpRequestData = {
    variableName?: string;
    endpoint?: string;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: string;
}

export const httpRequestExecutor: NodeExecutor<HttpRequestData> = async ({ data, nodeId, context, step }) => {
    // TODO: Publish loading state for http request

    if(!data?.variableName) {
        // TODO: Publish error state for http request
        throw new NonRetriableError("HTTP Request node: No variable name configured.")
    }

    if(!data?.endpoint) {
        // TODO: Publish error state for http request
        throw new NonRetriableError("HTTP Request node: No endpoint configured.")
    }

    const result = await step.run("http-request", async () => {
        const endpoint = data.endpoint!;
        const method = data.method || "GET";
        const body = data.body || "";

        const options: KyOptions = {
            method,
        }
        if(["POST", "PUT", "PATCH"].includes(method)) {
            options.body = data.body;
            options.headers = {
                "Content-Type": "application/json",
            }
        }
        
        const response = await ky(endpoint, options);
        const responseData = response.headers.get("Content-Type")?.includes("application/json") 
            ? await response.json() 
            : await response.text();

        const responsePayload = {
            status: response.status,
            statusText: response.statusText,
            data: responseData,
        }

        if(data.variableName) {
            return {
                ...context,
                [data.variableName]: responsePayload,
            }
        }

        // fallback
        return {
            ...context,
            ...responsePayload,
        }
    });

    // TODO: Publish success state for http request
    return result;
};
