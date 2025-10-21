import prisma from "@/lib/db";
import { inngest } from "./client";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.sleep("fetching-video", "5s");
    await step.sleep("transcribbing-video", "5s");
    await step.run("fetching-video", () => {
        return prisma.workflow.create({
            data: {
                name: "test-workflow-inngest"
            }
        })
    });
    return { message: `Hello ${event.data.email}!` };
  },
);