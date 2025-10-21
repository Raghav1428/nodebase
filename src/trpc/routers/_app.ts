import { inngest } from '@/inngest/client';
import { createTRPCRouter, protectedProcedure } from '../init';
import prisma from '@/lib/db';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export const appRouter = createTRPCRouter({

  testAi: protectedProcedure.mutation(async() => {
    await inngest.send({
      name: "execute/ai"
    })
    return { success: true, message: "Job queued" };
  }),

  getWorkflows: protectedProcedure.query(({ctx}) => {
      return prisma.workflow.findMany({
        where: {
          id: ctx.auth.user.id
        }
      });
    }),

    createWorkflow: protectedProcedure.mutation(async() => {

      await inngest.send({
        name: "test/hello.world",
        data: {
          email: "raghavseth1428@gmail.com"
        }
      })

      return { success: true, message: "Workflow creation initiated" };
    })
});
// export type definition of API
export type AppRouter = typeof appRouter;