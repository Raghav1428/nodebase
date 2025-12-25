import { channel, topic } from "@inngest/realtime";

export const mongodbChannelName = "mongodb-execution";

export const mongodbChannel = channel(mongodbChannelName).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>(),
);
