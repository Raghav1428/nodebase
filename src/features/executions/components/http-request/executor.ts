import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import ky, { type Options as KyOptions } from "ky";
import Handlebars from "handlebars";

Handlebars.registerHelper("json", (context) => {
    const jsonString = JSON.stringify(context);
    const safeString = new Handlebars.SafeString(jsonString);
    return safeString;
});

type HttpRequestData = {
    variableName: string;
    endpoint: string;
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
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

    if(!data?.method) {
        // TODO: Publish error state for http request
        throw new NonRetriableError("HTTP Request node: No method configured.")
    }

    const result = await step.run("http-request", async () => {
        const endpoint = Handlebars.compile(data.endpoint)(context);
        const method = data.method;
        const body = data.body || "";

        const options: KyOptions = {
            method,
        }
        if(["POST", "PUT", "PATCH"].includes(method)) {
            const resolved = Handlebars.compile(data.body || "{}")(context);
            JSON.parse(resolved);
            options.body = resolved;
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
            httpResponse: {
                data: responseData,
            }
            
        }

        return {
            ...context,
            [data.variableName]: responsePayload,
        }
    });

    // TODO: Publish success state for http request
    return result;
};
