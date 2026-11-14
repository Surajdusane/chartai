"use client";

import type { UIMessage } from "ai";

import { AssistantMessage } from "./assistant-message";
import { UserMessage } from "./user-message";

export function MessageItem({
  message,
  isStreaming,
  showActions = false,
  canRegenerate = false,
  onRegenerate,
  stopped = false,
}: {
  message: UIMessage;
  isStreaming: boolean;
  showActions?: boolean;
  canRegenerate?: boolean;
  onRegenerate?: () => void;
  stopped?: boolean;
}) {
  if (message.role === "user") {
    return <UserMessage message={message} />;
  }

  if (message.role === "assistant") {
    return (
      <AssistantMessage
        message={message}
        isStreaming={isStreaming}
        showActions={showActions}
        canRegenerate={canRegenerate}
        onRegenerate={onRegenerate}
        stopped={stopped}
      />
    );
  }

  return null;
}