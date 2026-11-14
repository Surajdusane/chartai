"use client";

import { useState } from "react";
import { BarChart3Icon, CodeIcon, TableIcon } from "lucide-react";

import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import type { RenderChartOutput } from "@/features/charts/types";

import { ChartCode } from "./chart-code";
import { ChartDataTable } from "./chart-data-table";
import { ChartRenderer } from "./chart-renderer";

export function ChartBlock({ output }: { output: RenderChartOutput }) {
  const [tab, setTab] = useState("chart");
  const { payload, spec } = output;

  return (
    <Tabs value={tab} onValueChange={(next) => setTab(String(next))} className="gap-0">
      <figure className="bg-card flex w-full flex-col overflow-hidden rounded-xl border" aria-label={spec.title}>
        <div className="flex flex-col items-start justify-between gap-2 border-b px-4 py-3 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <figcaption className="truncate text-sm font-medium">{spec.title}</figcaption>
            {spec.subtitle ? (
              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{spec.subtitle}</p>
            ) : null}
            <p className="text-muted-foreground mt-1 text-[11px]">
              {payload.rows.length}{" "}
              {payload.type === "pie" || payload.type === "radial" ? "slices" : "points"}
              {payload.meta.truncated ? ` · top ${payload.rows.length} of ${payload.meta.groups}` : ""}
              {` · ${payload.meta.aggregation}`}
            </p>
          </div>

          <TabsList>
            <TabsTab value="chart" aria-label="Chart">
              <BarChart3Icon />
            </TabsTab>
            <TabsTab value="data" aria-label="Data">
              <TableIcon />
            </TabsTab>
            <TabsTab value="code" aria-label="Code">
              <CodeIcon />
            </TabsTab>
          </TabsList>
        </div>

        <TabsPanel value="chart" className="p-4">
          <div className="h-[320px] w-full">
            <ChartRenderer payload={payload} />
          </div>
        </TabsPanel>
        <TabsPanel value="data" className="p-4">
          <ChartDataTable payload={payload} />
        </TabsPanel>
        <TabsPanel value="code" className="p-4">
          <ChartCode spec={spec} payload={payload} />
        </TabsPanel>
      </figure>
    </Tabs>
  );
}
