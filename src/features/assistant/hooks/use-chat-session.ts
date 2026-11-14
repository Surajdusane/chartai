"use client";

import { useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { useTRPC } from "@/trpc/client";

export const useChatSession = (input: { chatId: string; initialMessages: UIMessage[] }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, trigger }) => ({
          body: {
            chatId: input.chatId,
            message: messages.at(-1),
            trigger,
          },
        }),
      }),
    [input.chatId],
  );

  return useChat({
    id: input.chatId,
    messages: input.initialMessages,
    transport,
    onError: (error) => {
      toastManager.add({
        title: "The assistant could not answer",
        description: error.message,
        type: "error",
      });
    },
    onFinish: () => {
      queryClient.invalidateQueries(trpc.chats.getMany.queryOptions());
    },
  });
};
