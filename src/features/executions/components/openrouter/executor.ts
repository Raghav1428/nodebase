import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { generateText } from "ai";
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import Handlebars from "handlebars";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { openRouterChannel } from "@/inngest/channels/openrouter";

Handlebars.registerHelper("json", (context) => {
    const jsonString = JSON.stringify(context);
    const safeString = new Handlebars.SafeString(jsonString);
    return safeString;
});

type OpenRouterData = {
    variableName?: string;
    credentialId?: string;
    model?: string;
    systemPrompt?: string;
    userPrompt?: string;
}

export const openrouterExecutor: NodeExecutor<OpenRouterData> = async ({ data, nodeId, userId, context, step, publish }) => {
    await publish(
        openRouterChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    if(!data.variableName) {
        await publish(
            openRouterChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("OpenRouter Node: Variable name is required");
    }

    if(!data.userPrompt) {
        await publish(
            openRouterChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("OpenRouter Node: User prompt is required");
    }

    if(!data.credentialId) {
        await publish(
            openRouterChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("OpenRouter Node: Credential is required");
    }

    const systemPrompt = data.systemPrompt ? Handlebars.compile(data.systemPrompt)(context) : "You are a helpful assistant.";
    const userPrompt = Handlebars.compile(data.userPrompt)(context);

    const credential = await step.run("get-credential",() => {
        return prisma.credential.findUnique({
            where: {
                id: data.credentialId,
                userId,
            },
        })
    })

    if(!credential) {
        await publish(
            openRouterChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("OpenRouter Node: Credential not found");
    }

    const openrouter = createOpenRouter({
        apiKey: decrypt(credential.value),
    });

    try {
        const { steps } = await step.ai.wrap(
            "openrouter-generate-text",
            generateText,
            {
                model: openrouter(data.model || "gpt-4o-mini"),
                system: systemPrompt,
                prompt: userPrompt,
                experimental_telemetry: {
                    isEnabled: true,
                    recordInputs: true,
                    recordOutputs: true,
                },
            },
        );

        const text = steps[0]?.content?.find(c => c.type === "text")?.text ?? "";

        await publish(
            openRouterChannel().status({
                nodeId,
                status: "success",
            }),
        );

        return {
            ...context,
            [data.variableName]: {
                openRouterResponse: text
            }
        };

    } catch (error) {
        await publish(
            openRouterChannel().status({
                nodeId,
                status: "error",
            }),
        );

        throw new NonRetriableError("OpenRouter Node: OpenRouter execution failed", {
            cause: error,
        });
    }
};
