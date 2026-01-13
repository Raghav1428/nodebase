import { channel, topic } from "@inngest/realtime";

export const emailChannelName = "email-execution";

export const emailChannel = channel(emailChannelName).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>(),
);
