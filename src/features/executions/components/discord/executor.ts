import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars";
import { discordChannel } from "@/inngest/channels/discord";
import { decode } from "html-entities";
import ky from "ky";

Handlebars.registerHelper("json", (context) => {
    const jsonString = JSON.stringify(context);
    const safeString = new Handlebars.SafeString(jsonString);
    return safeString;
});

type DiscordData = {
    variableName?: string;
    webhookUrl?: string;
    content?: string;
    username?: string;
}

export const discordExecutor: NodeExecutor<DiscordData> = async ({ data, nodeId, context, step, publish }) => {
    await publish(
        discordChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    if(!data.content) {
        await publish(
            discordChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("Discord Node: Content is required");
    }

    const rawContent = Handlebars.compile(data.content)(context);
    const content = decode(rawContent);
    const username = data.username ? Handlebars.compile(data.username)(context) : "NodeBase";

    try {
        
        const result = await step.run("discord-webhook", async () => {

            if(!data.webhookUrl) {
                await publish(
                    discordChannel().status({
                        nodeId,
                        status: "error",
                    }),
                );
                throw new NonRetriableError("Discord Node: Webhook URL is required");
            }

            await ky.post(data.webhookUrl, {
                json: {
                    content: content.slice(0, 2000),
                    username,
                },
            });

            if(!data.variableName) {
                await publish(
                    discordChannel().status({
                        nodeId,
                        status: "error",
                    }),
                );
                throw new NonRetriableError("Discord Node: Variable name is required");
            }

            return {
                ...context,
                [data.variableName]: {
                    discordMessageContent: content.slice(0, 2000),
                    discordMessageSent: true,
                }
            };

        });

        await publish(
            discordChannel().status({
                nodeId,
                status: "success",
            }),
        );

        return result;

    } catch (error) {
        await publish(
            discordChannel().status({
                nodeId,
                status: "error",
            }),
        );

        throw new NonRetriableError("Discord Node: Discord execution failed", {
            cause: error,
        });
    }
};
