"use client";

import { useMemo } from "react";
import type { UIMessage } from "ai";

import { useStickToBottom } from "@/features/chats/hooks/use-stick-to-bottom";

import { JumpToLatest } from "./jump-to-latest";
import { MessageItem } from "./message-item";

export function MessageList(props: {
  messages: UIMessage[];
  isStreaming: boolean;
  emptyState?: React.ReactNode;
}) {
  const lastMessage = props.messages.at(-1);
  const contentKey = useMemo(
    () => `${props.messages.length}:${lastMessage?.parts.length ?? 0}`,
    [props.messages.length, lastMessage?.parts.length],
  );

  const { containerRef, isPinned, scrollToBottom } = useStickToBottom(contentKey);

  if (props.messages.length === 0) {
    return <div className="flex min-h-0 flex-1 items-center justify-center p-6">{props.emptyState}</div>;
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={containerRef}
        className="h-full overflow-y-auto overscroll-contain"
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
          {props.messages.map((message, index) => (
            <MessageItem
              key={message.id}
              message={message}
              isStreaming={props.isStreaming && index === props.messages.length - 1}
            />
          ))}
          {props.isStreaming && lastMessage?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl p-4 w-full max-w-[min(42rem,85%)]">
                <h4 className="shimmer text-muted-foreground font-medium text-sm">Generating response</h4>
                <p className="shimmer text-muted-foreground mt-2">Analyzing your data…</p>
                <p className="shimmer text-muted-foreground mt-1 w-3/4">Please wait…</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {!isPinned ? <JumpToLatest onClick={scrollToBottom} /> : null}
    </div>
  );
}