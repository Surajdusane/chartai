"use client";

import { useEffect, useMemo, useState } from "react";

import { useChatSession } from "@/features/assistant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ChatComposer } from "@/features/chats/components/composer";
import { FollowUpChips } from "@/features/chats/components/follow-up-chips";
import { MessageList } from "@/features/chats/components/message-list";
import { useGetChat } from "@/features/chats/hooks";
import { getMessageText } from "@/features/chats/utils/get-message-text";
import { toUiMessages } from "@/features/chats/utils/to-ui-messages";

import { ChatEmptyState } from "./chat-empty-state";

export function ChatThread({ chatId }: { chatId: string }) {
  const { data: chat } = useGetChat(chatId);
  const initialMessages = useMemo(() => toUiMessages(chat), [chat]);
  const { messages, sendMessage, status, stop, regenerate, error, clearError } = useChatSession({
    chatId,
    initialMessages,
  });

  const [wasStopped, setWasStopped] = useState(false);

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    document.title = `${chat.title} · Chart AI`;
  }, [chat.title]);

  const lastMessage = messages.at(-1);
  const lastAssistant = lastMessage?.role === "assistant" ? lastMessage : undefined;
  const lastAssistantHasText = lastAssistant ? getMessageText(lastAssistant).length > 0 : false;

  const thinkingLabel =
    status === "submitted"
      ? "Thinking…"
      : status === "streaming" && (!lastAssistant || !lastAssistantHasText)
        ? "Reading your dataset…"
        : null;

  const showFollowUps =
    status === "ready" &&
    !error &&
    messages.length <= 8 &&
    messages.some((message) => message.role === "assistant");

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
    setWasStopped(false);
    void sendMessage({ text });
  };

  const handleStop = () => {
    setWasStopped(true);
    void stop();
  };

  const handleRegenerate = () => {
    setWasStopped(false);
    void regenerate();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-13 shrink-0 items-center gap-2 border-b px-2 sm:h-14 sm:px-3">
        <SidebarTrigger />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-medium">{chat.title}</span>
          <Badge variant="secondary" className="hidden max-w-40 shrink-0 truncate md:inline-flex">
            {dataset.name}
          </Badge>
        </div>
        <span className="text-muted-foreground hidden shrink-0 text-xs lg:inline">
          {dataset.rowCount.toLocaleString()} rows · {dataset.columns.length} cols
        </span>
      </header>

      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        thinkingLabel={thinkingLabel}
        stopped={wasStopped && status === "ready"}
        onRegenerate={handleRegenerate}
        emptyState={<ChatEmptyState onPick={send} columns={dataset.columns} />}
      />

      <div className="bg-background/80 shrink-0 border-t px-2 pt-3 pb-3 backdrop-blur sm:px-4 sm:pb-4">
        <div className="mx-auto w-full max-w-3xl">
          {error ? (
            <div
              className="border-destructive/40 bg-destructive/5 mb-2 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs"
              role="alert"
            >
              <span className="truncate">{error.message}</span>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={handleRegenerate}>
                  Retry
                </Button>
                <Button size="sm" variant="ghost" onClick={clearError}>
                  Dismiss
                </Button>
              </div>
            </div>
          ) : null}
          {showFollowUps ? (
            <div className="mb-2">
              <FollowUpChips columns={dataset.columns} onPick={send} disabled={isStreaming} />
            </div>
          ) : null}
          <ChatComposer
            onSend={send}
            onStop={handleStop}
            isStreaming={isStreaming}
            disabled={isStreaming}
          />
          <p className="text-muted-foreground mt-2 hidden text-center text-[11px] sm:block">
            Answers are generated from your uploaded dataset only.
          </p>
        </div>
      </div>
    </div>
  );
}