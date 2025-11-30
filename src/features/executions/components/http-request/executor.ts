import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import ky, { type Options as KyOptions } from "ky";
import Handlebars from "handlebars";
import { httpRequestChannel } from "@/inngest/channels/http-request";

Handlebars.registerHelper("json", (context) => {
    const jsonString = JSON.stringify(context);
    const safeString = new Handlebars.SafeString(jsonString);
    return safeString;
});

type HttpRequestData = {
    variableName?: string;
    endpoint?: string;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: string;
}

export const httpRequestExecutor: NodeExecutor<HttpRequestData> = async ({ data, nodeId, context, step, publish }) => {
    await publish(
        httpRequestChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    try {
        const result = await step.run("http-request", async () => {

            if(!data?.variableName) {
                await publish(
                    httpRequestChannel().status({
                        nodeId,
                        status: "error",
                    }),
                );
                throw new NonRetriableError("HTTP Request node: No variable name configured.")
            }

            if(!data?.endpoint) {
                await publish(
                    httpRequestChannel().status({
                        nodeId,
                        status: "error",
                    }),
                );
                throw new NonRetriableError("HTTP Request node: No endpoint configured.")
            }

            if(!data?.method) {
                await publish(
                    httpRequestChannel().status({
                        nodeId,
                        status: "error",
                    }),
                );
                throw new NonRetriableError("HTTP Request node: No method configured.")
            }

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

        await publish(
                httpRequestChannel().status({
                    nodeId,
                    status: "success",
                }),
            );
        return result;
    } catch (error) {
        await publish(
            httpRequestChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw error;
    }
};
