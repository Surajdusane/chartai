import { prefetch, trpc } from "@/trpc/server";

export const prefetchChats = () => prefetch(trpc.chats.getMany.queryOptions());

export const prefetchChat = (id: string) =>
  prefetch(trpc.chats.getById.queryOptions({ id }));
