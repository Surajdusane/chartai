"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { useTRPC } from "@/trpc/client";

export const useDeleteChat = (activeChatId?: string) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation(
    trpc.chats.remove.mutationOptions({
      onSuccess: (chat) => {
        toastManager.add({
          title: "Chat deleted",
          description: "The chat and its dataset were removed.",
          type: "success",
        });
        queryClient.removeQueries(trpc.chats.getById.queryOptions({ id: chat.id }));
        queryClient.invalidateQueries(trpc.chats.getMany.queryOptions());

        if (activeChatId === chat.id) {
          router.push("/");
        }
      },
      onError: (error) => {
        toastManager.add({
          title: "Could not delete chat",
          description: error.message,
          type: "error",
        });
      },
    }),
  );
};
