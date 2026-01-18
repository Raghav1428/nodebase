import { channel, topic } from "@inngest/realtime";

export const googleSheetsTriggerChannelName = "google-sheets-trigger-execution";

export const googleSheetsTriggerChannel = channel(googleSheetsTriggerChannelName).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>(),
);
