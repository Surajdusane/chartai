import { z } from "zod";

export const getChatSchema = z.object({
  id: z.string().min(1),
});

export const renameChatSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(80),
});

export const deleteChatSchema = z.object({
  id: z.string().min(1),
});

export type GetChatSchema = z.infer<typeof getChatSchema>;
export type RenameChatSchema = z.infer<typeof renameChatSchema>;
export type DeleteChatSchema = z.infer<typeof deleteChatSchema>;
