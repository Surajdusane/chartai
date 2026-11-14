"use client";

import { useMemo, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import type { ChartSpec } from "@/features/charts/schema";
import type { ChartPayload } from "@/features/charts/types";
import { specToCode } from "@/features/charts/utils/spec-to-code";

export function ChartCode({ spec, payload }: { spec: ChartSpec; payload: ChartPayload }) {
  const [copied, setCopied] = useState(false);
  const code = useMemo(() => specToCode(spec, payload), [spec, payload]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1_500);
      toastManager.add({
        title: "Copied to clipboard",
        description: "The chart code is on your clipboard.",
        type: "success",
      });
    } catch {
      toastManager.add({
        title: "Could not copy",
        description: "Your browser blocked clipboard access. Select the code and copy it manually.",
        type: "error",
      });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-[11px]">
          Read-only preview. The Data tab has the same numbers as a table.
        </p>
        <Button size="sm" variant="outline" onClick={() => void copy()} aria-label="Copy chart code">
          {copied ? <CheckIcon /> : <CopyIcon />}
          <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>
      <pre className="bg-muted/40 h-[300px] overflow-auto rounded-lg border p-4 text-xs">
        <code>{code}</code>
      </pre>
    </div>
  );
}
