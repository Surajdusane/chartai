"use client";

import { useState } from "react";
import type { UIMessage } from "ai";

import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ChatComposer } from "@/features/chats/components/composer";
import { MessageList } from "@/features/chats/components/message-list";
import { useGetChat } from "@/features/chats/hooks";
import { toUiMessages } from "@/features/chats/utils/to-ui-messages";

import { ChatEmptyState } from "./chat-empty-state";

export function ChatThread({ chatId }: { chatId: string }) {
  const { data: chat } = useGetChat(chatId);
  const [messages, setMessages] = useState<UIMessage[]>(() => toUiMessages(chat));
  const [isStreaming, setIsStreaming] = useState(false);

  if (!chat.dataset) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center p-6">
        <p className="text-muted-foreground text-sm">This chat has no dataset attached.</p>
      </div>
    );
  }

  const dataset = chat.dataset;

  // TEMPORARY — step 07 replaces this with useChat + /api/chat.
  const send = (text: string) => {
    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: userId, role: "user", parts: [{ type: "text", text }] },
      {
        id: assistantId,
        role: "assistant",
        parts: [
          { type: "step-start" },
          {
            type: "text",
            text: `**Streaming arrives in step 07.**\n\nYou asked: “${text}”\n\nThis dataset has **${dataset.rowCount.toLocaleString()} rows** and **${dataset.columns.length} columns**: ${dataset.columns
              .slice(0, 8)
              .map((column) => `\`${column.name}\``)
              .join(", ")}.`,
          },
        ],
      },
    ]);
    setIsStreaming(false);
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
          <ChatComposer onSend={send} isStreaming={isStreaming} onStop={() => setIsStreaming(false)} />
          <p className="text-muted-foreground mt-2 text-center text-[11px]">
            Answers are generated from your uploaded dataset only.
          </p>
        </div>
      </div>
    </div>
  );
}