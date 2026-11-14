"use client";

import { type UIMessage } from "ai";

import { getMessageText } from "@/features/chats/utils/get-message-text";

export function UserMessage({ message }: { message: UIMessage }) {
  const text = getMessageText(message);

  if (!text) return null;

  return (
    <div className="flex justify-end">
      <div className="bg-muted max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap sm:max-w-[75%]">
        {text}
      </div>
    </div>
  );
}