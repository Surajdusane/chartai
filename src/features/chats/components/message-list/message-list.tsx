"use client";

import { useMemo } from "react";
import type { UIMessage } from "ai";

import { useStickToBottom } from "@/features/chats/hooks/use-stick-to-bottom";

import { JumpToLatest } from "./jump-to-latest";
import { MessageItem } from "./message-item";
import { ThinkingIndicator } from "./thinking-indicator";

export function MessageList(props: {
  messages: UIMessage[];
  isStreaming: boolean;
  emptyState?: React.ReactNode;
  thinkingLabel?: string | null;
  stopped?: boolean;
  onRegenerate?: () => void;
  footer?: React.ReactNode;
}) {
  const lastMessage = props.messages.at(-1);
  const contentKey = useMemo(
    () => `${props.messages.length}:${lastMessage?.parts.length ?? 0}`,
    [props.messages.length, lastMessage?.parts.length],
  );

  const { containerRef, contentRef, isPinned, scrollToBottom } = useStickToBottom(contentKey);
  const hasUserMessage = props.messages.some((message) => message.role === "user");

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
          aria-relevant="additions text"
          aria-busy={props.isStreaming}
          aria-label="Conversation"
        >
        <div
          ref={contentRef}
          className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-3 py-6 sm:gap-8 sm:px-4 sm:py-8"
        >
          {props.messages.map((message, index) => {
            const isLast = index === props.messages.length - 1;

            return (
              <MessageItem
                key={message.id}
                message={message}
                isStreaming={props.isStreaming && isLast}
                showActions={isLast && !props.isStreaming}
                canRegenerate={isLast && hasUserMessage && Boolean(props.onRegenerate)}
                onRegenerate={props.onRegenerate}
                stopped={isLast && Boolean(props.stopped)}
              />
            );
          })}
          {props.thinkingLabel ? <ThinkingIndicator label={props.thinkingLabel} /> : null}
          {props.footer ? props.footer : null}
        </div>
      </div>
      {!isPinned ? <JumpToLatest onClick={scrollToBottom} /> : null}
    </div>
  );
}