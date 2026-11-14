"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, RotateCcwIcon } from "lucide-react";
import type { UIMessage } from "ai";

import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { getMessageText } from "@/features/chats/utils/get-message-text";

export function MessageActions(props: {
  message: UIMessage;
  canRegenerate: boolean;
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = getMessageText(props.message, "\n\n");
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1_500);
    } catch {
      toastManager.add({
        title: "Could not copy",
        description: "Your browser blocked clipboard access.",
        type: "error",
      });
    }
  };

  return (
    <div className="flex items-center gap-1 transition-opacity focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
      <Button size="icon-sm" variant="ghost" onClick={() => void copy()} aria-label="Copy answer">
        {copied ? <CheckIcon /> : <CopyIcon />}
      </Button>
      {props.canRegenerate ? (
        <Button size="icon-sm" variant="ghost" onClick={props.onRegenerate} aria-label="Regenerate answer">
          <RotateCcwIcon />
        </Button>
      ) : null}
    </div>
  );
}