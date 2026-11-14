"use client";

import { isTextUIPart, type UIMessage } from "ai";

export function UserMessage({ message }: { message: UIMessage }) {
  const text = message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("\n");

  if (!text.trim()) return null;

  return (
    <div className="flex justify-end">
      <div className="bg-muted max-w-[min(42rem,85%)] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap">
        {text}
      </div>
    </div>
  );
}