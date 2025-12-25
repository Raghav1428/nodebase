import { channel, topic } from "@inngest/realtime";

export const postgresChannelName = "postgres-execution";

export const postgresChannel = channel(postgresChannelName).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>(),
);
