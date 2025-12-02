import { channel, topic } from "@inngest/realtime";

export const discordChannelName = "discord-execution";

export const discordChannel = channel(discordChannelName).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>(),
);