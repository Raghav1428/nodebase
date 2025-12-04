import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { executeWorkflow } from "@/inngest/functions";
import { scheduledWorkflowRunner } from "@/inngest/scheduled-workflow-runner";

// Create an API that serves Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    executeWorkflow,
    scheduledWorkflowRunner,
  ],
});