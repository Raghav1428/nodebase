import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import Handlebars from "handlebars";
import { openAIChannel } from "@/inngest/channels/openai";
import prisma from "@/lib/db";

Handlebars.registerHelper("json", (context) => {
    const jsonString = JSON.stringify(context);
    const safeString = new Handlebars.SafeString(jsonString);
    return safeString;
});

type OpenAIData = {
    variableName?: string;
    credentialId?: string;
    model?: string;
    systemPrompt?: string;
    userPrompt?: string;
}

export const openaiExecutor: NodeExecutor<OpenAIData> = async ({ data, nodeId, userId, context, step, publish }) => {
    await publish(
        openAIChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    if(!data.variableName) {
        await publish(
            openAIChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("OpenAI Node: Variable name is required");
    }

    if(!data.userPrompt) {
        await publish(
            openAIChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("OpenAI Node: User prompt is required");
    }

    if(!data.credentialId) {
        await publish(
            openAIChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("OpenAI Node: Credential is required");
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
            openAIChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("OpenAI Node: Credential not found");
    }

    const openai = createOpenAI({
        apiKey: credential.value,
    });

    try {
        const { steps } = await step.ai.wrap(
            "openai-generate-text",
            generateText,
            {
                model: openai(data.model || "gpt-4o-mini"),
                system: systemPrompt,
                prompt: userPrompt,
                experimental_telemetry: {
                    isEnabled: true,
                    recordInputs: true,
                    recordOutputs: true,
                },
            },
        );

        const text = steps[0]?.content[0]?.type === "text" ? steps[0].content[0].text : "";

        await publish(
            openAIChannel().status({
                nodeId,
                status: "success",
            }),
        );

        return {
            ...context,
            [data.variableName]: {
                openAIResponse: text
            }
        };

    } catch (error) {
        await publish(
            openAIChannel().status({
                nodeId,
                status: "error",
            }),
        );

        throw new NonRetriableError("OpenAI Node: OpenAI execution failed", {
            cause: error,
        });
    }
};
