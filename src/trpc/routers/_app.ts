import { createTRPCRouter } from "@/trpc/init";

import { chatsRouter } from "./chats";
import { healthRouter } from "./health";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  chats: chatsRouter,
});

export type AppRouter = typeof appRouter;
