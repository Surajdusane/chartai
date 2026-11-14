"use client";

import { Spinner } from "@/components/ui/spinner";

export function ThinkingIndicator({ label = "Thinking…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-start gap-2.5 py-1" role="status" aria-live="polite">
      <Spinner className="text-muted-foreground size-4 shrink-0" />
      <span className="shimmer text-sm font-medium">{label}</span>
    </div>
  );
}