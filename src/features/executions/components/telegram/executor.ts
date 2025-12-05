import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars";
import { telegramChannel } from "@/inngest/channels/telegram";
import { decode } from "html-entities";
import ky from "ky";

Handlebars.registerHelper("json", (context) => {
    const jsonString = JSON.stringify(context);
    const safeString = new Handlebars.SafeString(jsonString);
    return safeString;
});

type TelegramData = {
    variableName?: string;
    botToken?: string;
    chatId?: string;
    content?: string;
}

export const telegramExecutor: NodeExecutor<TelegramData> = async ({ data, nodeId, context, step, publish }) => {
    await publish(
        telegramChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    if (!data.content) {
        await publish(
            telegramChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("Telegram Node: Content is required");
    }

    const rawContent = Handlebars.compile(data.content)(context);
    const content = decode(rawContent);

    try {

        const result = await step.run("telegram-send-message", async () => {

            if (!data.variableName) {
                await publish(
                    telegramChannel().status({
                        nodeId,
                        status: "error",
                    }),
                );
                throw new NonRetriableError("Telegram Node: Variable name is required");
            }

            if (!data.botToken) {
                await publish(
                    telegramChannel().status({
                        nodeId,
                        status: "error",
                    }),
                );
                throw new NonRetriableError("Telegram Node: Bot Token is required");
            }

            if (!data.chatId) {
                await publish(
                    telegramChannel().status({
                        nodeId,
                        status: "error",
                    }),
                );
                throw new NonRetriableError("Telegram Node: Chat ID is required");
            }

            // Telegram Bot API URL
            const telegramApiUrl = `https://api.telegram.org/bot${data.botToken}/sendMessage`;

            const response = await ky.post(telegramApiUrl, {
                json: {
                    chat_id: data.chatId,
                    text: content.slice(0, 4096),
                    parse_mode: "Markdown",
                },
            }).json<{ ok: boolean; result?: { message_id: number } }>();

            return {
                ...context,
                [data.variableName]: {
                    telegramMessageContent: content.slice(0, 4096),
                    telegramMessageSent: response.ok,
                    telegramMessageId: response.result?.message_id,
                }
            };

        });

        await publish(
            telegramChannel().status({
                nodeId,
                status: "success",
            }),
        );

        return result;

    } catch (error) {
        await publish(
            telegramChannel().status({
                nodeId,
                status: "error",
            }),
        );

        throw new NonRetriableError("Telegram Node: Telegram execution failed", {
            cause: error,
        });
    }
};

