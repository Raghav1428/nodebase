import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars";
import { decode } from "html-entities";
import ky from "ky";
import { slackChannel } from "@/inngest/channels/slack";

Handlebars.registerHelper("json", (context) => {
    const jsonString = JSON.stringify(context);
    const safeString = new Handlebars.SafeString(jsonString);
    return safeString;
});

type SlackData = {
    variableName?: string;
    webhookUrl?: string;
    content?: string;
}

export const slackExecutor: NodeExecutor<SlackData> = async ({ data, nodeId, context, step, publish }) => {
    await publish(
        slackChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    if(!data.content) {
        await publish(
            slackChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("Slack Node: Content is required");
    }

    const rawContent = Handlebars.compile(data.content)(context);
    const content = decode(rawContent);

    try {
        
        const result = await step.run("slack-webhook", async () => {

            if(!data.webhookUrl) {
                await publish(
                    slackChannel().status({
                        nodeId,
                        status: "error",
                    }),
                );
                throw new NonRetriableError("Slack Node: Webhook URL is required");
            }

            await ky.post(data.webhookUrl, {
                json: {
                    content,
                },
            });

            if(!data.variableName) {
                await publish(
                    slackChannel().status({
                        nodeId,
                        status: "error",
                    }),
                );
                throw new NonRetriableError("Slack Node: Variable name is required");
            }

            return {
                ...context,
                [data.variableName]: {
                    slackMessageContent: content.slice(0, 2000),
                    slackMessageSent: true,
                }
            };

        });

        await publish(
            slackChannel().status({
                nodeId,
                status: "success",
            }),
        );

        return result;

    } catch (error) {
        await publish(
            slackChannel().status({
                nodeId,
                status: "error",
            }),
        );

        throw new NonRetriableError("Slack Node: Slack execution failed", {
            cause: error,
        });
    }
};
