import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import Handlebars from "handlebars";
import { openAIChannel } from "@/inngest/channels/openai";

Handlebars.registerHelper("json", (context) => {
    const jsonString = JSON.stringify(context);
    const safeString = new Handlebars.SafeString(jsonString);
    return safeString;
});

type OpenAIData = {
    variableName?: string;
    model?: string;
    systemPrompt?: string;
    userPrompt?: string;
}

export const openaiExecutor: NodeExecutor<OpenAIData> = async ({ data, nodeId, context, step, publish }) => {
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

    // TODO: Throw err if credential is missing

    const systemPrompt = data.systemPrompt ? Handlebars.compile(data.systemPrompt)(context) : "You are a helpful assistant.";
    const userPrompt = Handlebars.compile(data.userPrompt)(context);

    // TODO: Fetch Credentials that user gives

    const credentialValue = process.env.OPENAI_API_KEY!;

    const openai = createOpenAI({
        apiKey: credentialValue,
    });

    try {
        const { steps } = await step.ai.wrap(
            "openai-generate-text",
            generateText,
            {
                model: openai(data.model || "gpt-4"),
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
