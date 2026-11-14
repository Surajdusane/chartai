"use client";

import { useMemo } from "react";

import { useChatSession } from "@/features/assistant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ChatComposer } from "@/features/chats/components/composer";
import { MessageList } from "@/features/chats/components/message-list";
import { useGetChat } from "@/features/chats/hooks";
import { toUiMessages } from "@/features/chats/utils/to-ui-messages";

import { ChatEmptyState } from "./chat-empty-state";

export function ChatThread({ chatId }: { chatId: string }) {
  const { data: chat } = useGetChat(chatId);
  const initialMessages = useMemo(() => toUiMessages(chat), [chat]);
  const { messages, sendMessage, status, stop, regenerate, error, clearError } = useChatSession({
    chatId,
    initialMessages,
  });

  const isStreaming = status === "streaming" || status === "submitted";

  if (!chat.dataset) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center p-6">
        <p className="text-muted-foreground text-sm">This chat has no dataset attached.</p>
      </div>
    );
  }

  const dataset = chat.dataset;

  const send = (text: string) => {
    if (isStreaming) return;
    void sendMessage({ text });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
        <SidebarTrigger />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-medium">{chat.title}</span>
          <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
            {dataset.name}
          </Badge>
        </div>
        <span className="text-muted-foreground hidden shrink-0 text-xs sm:inline">
          {dataset.rowCount.toLocaleString()} rows · {dataset.columns.length} cols
        </span>
      </header>

      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        emptyState={<ChatEmptyState onPick={send} columns={dataset.columns} />}
      />

      <div className="bg-background/80 shrink-0 border-t px-4 pt-3 pb-4 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl">
          {error ? (
            <div
              className="border-destructive/40 bg-destructive/5 mb-2 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs"
              role="alert"
            >
              <span className="truncate">{error.message}</span>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    clearError();
                    void regenerate();
                  }}
                >
                  Retry
                </Button>
                <Button size="sm" variant="ghost" onClick={clearError}>
                  Dismiss
                </Button>
              </div>
            </div>
          ) : null}
          <ChatComposer
            onSend={send}
            onStop={() => void stop()}
            isStreaming={isStreaming}
            disabled={isStreaming}
          />
          <p className="text-muted-foreground mt-2 text-center text-[11px]">
            Answers are generated from your uploaded dataset only.
          </p>
        </div>
      </div>
    </div>
  );
}