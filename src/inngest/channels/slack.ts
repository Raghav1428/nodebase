import { channel, topic } from "@inngest/realtime";

export const slackChannelName = "slack-execution";

export const slackChannel = channel(slackChannelName).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>(),
);