"use client";

import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { ChatError } from "./chat-error";
import { ChatSkeleton } from "./chat-skeleton";
import { ChatThread } from "./chat-thread";

export function ChatView({ chatId }: { chatId: string }) {
  return (
    <ErrorBoundary fallbackRender={({ error }) => <ChatError error={error} />}>
      <Suspense fallback={<ChatSkeleton />}>
        <ChatThread chatId={chatId} />
      </Suspense>
    </ErrorBoundary>
  );
}