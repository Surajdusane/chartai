import { TRPCError } from "@trpc/server";

import {
  deleteChat,
  getChatById,
  getChats,
  renameChat,
} from "@/db/queries";
import { createTRPCRouter } from "@/trpc/init";
import { authorizedProcedure } from "@/trpc/procedures/authorizedProcedure";
import { deleteChatSchema, getChatSchema, renameChatSchema } from "@/trpc/schema";

export const chatsRouter = createTRPCRouter({
  getMany: authorizedProcedure.query(async ({ ctx: { db } }) => {
    return getChats(db);
  }),

  getById: authorizedProcedure.input(getChatSchema).query(async ({ ctx: { db }, input }) => {
    const chat = await getChatById(db, input.id);
    if (!chat) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Chat not found." });
    }
    return chat;
  }),

  rename: authorizedProcedure.input(renameChatSchema).mutation(async ({ ctx: { db }, input }) => {
    const chat = await renameChat(db, input);
    if (!chat) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Chat not found." });
    }
    return chat;
  }),

  remove: authorizedProcedure.input(deleteChatSchema).mutation(async ({ ctx: { db }, input }) => {
    const chat = await deleteChat(db, input.id);
    if (!chat) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Chat not found." });
    }
    return chat;
  }),
});
