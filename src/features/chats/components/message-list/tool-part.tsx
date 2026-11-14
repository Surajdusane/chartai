"use client";

import type { DynamicToolUIPart, ToolUIPart, UITools } from "ai";

import { ChartBlock } from "@/features/charts";
import { ChartErrorCard, ChartSkeleton } from "@/features/charts";
import { parseRenderChartOutput } from "@/features/charts/utils/guard";

type AnyToolPart = ToolUIPart<UITools> | DynamicToolUIPart;

export function ToolPart({ name, part }: { name: string; part: AnyToolPart }) {
  if (name !== "renderChart") {
    // step 07 adds queryData; until then, keep a neutral card.
    if (part.state === "output-error") {
      const errorText =
        "errorText" in part && typeof part.errorText === "string" ? part.errorText : "The tool failed.";
      return <ChartErrorCard title={name} message={errorText} />;
    }
    if (part.state === "output-available") {
      return <div className="bg-muted/40 rounded-lg border p-3 text-xs">Using a tool…</div>;
    }
    return <ChartSkeleton />;
  }

  if (part.state === "input-streaming" || part.state === "input-available") {
    return <ChartSkeleton />;
  }

  if (part.state === "output-error") {
    return <ChartErrorCard message={part.errorText ?? "The chart could not be built."} />;
  }

  if (part.state === "output-available") {
    const output = parseRenderChartOutput(part.output);
    if (!output) {
      return <ChartErrorCard message="This chart was saved in an unknown format. Ask again." />;
    }
    return <ChartBlock output={output} />;
  }

  return null;
}
