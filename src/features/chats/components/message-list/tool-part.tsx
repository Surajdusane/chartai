"use client";

import type { DynamicToolUIPart, ToolUIPart, UITools } from "ai";

import { DataTableBlock, parseQueryDataOutput } from "@/features/assistant";
import { ChartBlock, ChartErrorCard, ChartSkeleton, parseRenderChartOutput } from "@/features/charts";

type AnyToolPart = ToolUIPart<UITools> | DynamicToolUIPart;

export function ToolPart({ name, part }: { name: string; part: AnyToolPart }) {
  if (name === "renderChart") {
    if (part.state === "input-streaming" || part.state === "input-available") return <ChartSkeleton />;
    if (part.state === "output-error") {
      return <ChartErrorCard message={part.errorText ?? "The chart could not be built."} />;
    }
    if (part.state === "output-available") {
      const output = parseRenderChartOutput(part.output);
      return output ? (
        <ChartBlock output={output} />
      ) : (
        <ChartErrorCard message="This chart was saved in an unknown format." />
      );
    }
    return null;
  }

  if (name === "queryData") {
    if (part.state === "input-streaming" || part.state === "input-available") {
      return <div className="bg-muted/40 h-20 animate-pulse rounded-lg border" />;
    }
    if (part.state === "output-error") {
      return (
        <ChartErrorCard
          title="Could not read the data"
          message={part.errorText ?? "The query failed."}
        />
      );
    }
    if (part.state === "output-available") {
      const output = parseQueryDataOutput(part.output);
      return output ? <DataTableBlock output={output} /> : null;
    }
    return null;
  }

  if (part.state === "output-error") {
    const errorText =
      "errorText" in part && typeof part.errorText === "string" ? part.errorText : "The tool failed.";
    return <ChartErrorCard title={name} message={errorText} />;
  }
  return null;
}
