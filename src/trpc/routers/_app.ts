import { createTRPCRouter } from '../init';
import { workkflowsRouter } from '@/features/workflows/server/routers';

export const appRouter = createTRPCRouter({
  workflows: workkflowsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;