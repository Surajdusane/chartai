"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";

export const useGetChats = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.chats.getMany.queryOptions());
};
