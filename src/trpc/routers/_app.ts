import { createTRPCRouter } from "@/trpc/init";

import { chatsRouter } from "./chats";
import { datasetsRouter } from "./datasets";
import { healthRouter } from "./health";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  chats: chatsRouter,
  datasets: datasetsRouter,
});

export type AppRouter = typeof appRouter;
