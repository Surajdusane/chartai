"use client";

import type { UIMessage } from "ai";

import { AssistantMessage } from "./assistant-message";
import { UserMessage } from "./user-message";

export function MessageItem({ message, isStreaming }: { message: UIMessage; isStreaming: boolean }) {
  if (message.role === "user") {
    return <UserMessage message={message} />;
  }

  if (message.role === "assistant") {
    return <AssistantMessage message={message} isStreaming={isStreaming} />;
  }

  return null;
}