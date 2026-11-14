import { createTRPCRouter } from "@/trpc/init";
import { authorizedProcedure } from "@/trpc/procedures/authorizedProcedure";

export const healthRouter = createTRPCRouter({
  ping: authorizedProcedure.query(() => ({ ok: true })),
});