"use client";

import { AlertTriangleIcon } from "lucide-react";
import type { DynamicToolUIPart, ToolUIPart, UITools } from "ai";

import { Skeleton } from "@/components/ui/skeleton";

type AnyToolPart = ToolUIPart<UITools> | DynamicToolUIPart;

export function ToolPart({ name, part }: { name: string; part: AnyToolPart }) {
  if (part.state === "output-error") {
    const errorText =
      "errorText" in part && typeof part.errorText === "string" ? part.errorText : "The tool failed.";

    return (
      <div className="border-destructive/30 bg-destructive/5 rounded-lg border p-3">
        <p className="text-destructive flex items-center gap-1.5 text-xs font-medium">
          <AlertTriangleIcon className="size-3.5" />
          {name}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">{errorText}</p>
      </div>
    );
  }

  if (part.state === "output-available") {
    return (
      <div className="bg-card rounded-lg border p-3">
        <p className="text-xs font-medium">{name}</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Result ready. Chart rendering arrives in step 06.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs font-medium">Preparing result…</span>
        <span className="text-muted-foreground/70 truncate text-[11px]">{name}</span>
      </div>
      <Skeleton className="mt-2 h-24 w-full" />
    </div>
  );
}