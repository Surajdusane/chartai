"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";

export const useGetChat = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.chats.getById.queryOptions({ id }));
};
