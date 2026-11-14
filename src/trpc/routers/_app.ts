import { createTRPCRouter } from "@/trpc/init";

import { healthRouter } from "./health";

export const appRouter = createTRPCRouter({
  health: healthRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;