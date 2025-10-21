import prisma from "@/lib/db";
import { inngest } from "./client";
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';

const google = createGoogleGenerativeAI();
const openai = createOpenAI();
const anthropic = createAnthropic();

export const execute = inngest.createFunction(
  { id: "execute-ai" },
  { event: "execute/ai" },
  async ({ event, step }) => {

    await step.sleep("pretend", "5s")

    const { steps: geminiSteps } = await step.ai.wrap("gemini-generate-text", generateText, {
        model: google("gemini-2.5-flash"),
        system: "You are a helpful assistant.",
        prompt: "What is 2+2 ?",
        experimental_telemetry: {
          isEnabled: true,
          recordInputs: true,
          recordOutputs: true,
        },
    });

    const { steps: opeanaiSteps } = await step.ai.wrap("openai-generate-text", generateText, {
        model: openai("gpt-3.5-turbo"),
        system: "You are a helpful assistant.",
        prompt: "What is 2+2 ?",
        experimental_telemetry: {
          isEnabled: true,
          recordInputs: true,
          recordOutputs: true,
        },
    });

    const { steps: anthropoicSteps } = await step.ai.wrap("anthropic-generate-text", generateText, {
        model: anthropic("claude-3-5-haiku-20241022"),
        system: "You are a helpful assistant.",
        prompt: "What is 2+2 ?",
        experimental_telemetry: {
          isEnabled: true,
          recordInputs: true,
          recordOutputs: true,
        },
    });

    return {
        geminiSteps,
        opeanaiSteps,
        anthropoicSteps
    };
  },
);