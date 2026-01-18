import { channel, topic } from "@inngest/realtime";

export const googleSheetsChannelName = "google-sheets-execution";

export const googleSheetsChannel = channel(googleSheetsChannelName).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>(),
);
