"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { useTRPC } from "@/trpc/client";

export const useRenameChat = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.chats.rename.mutationOptions({
      onSuccess: (chat) => {
        toastManager.add({
          title: "Chat renamed",
          description: `Saved as “${chat.title}”.`,
          type: "success",
        });
        queryClient.invalidateQueries(trpc.chats.getMany.queryOptions());
        queryClient.invalidateQueries(trpc.chats.getById.queryOptions({ id: chat.id }));
      },
      onError: (error) => {
        toastManager.add({
          title: "Could not rename chat",
          description: error.message,
          type: "error",
        });
      },
    }),
  );
};
