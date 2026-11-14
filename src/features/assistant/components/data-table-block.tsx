"use client";

import { TableIcon } from "lucide-react";

import { ResultTable } from "@/features/charts";
import type { QueryDataOutput } from "@/features/assistant/utils/guard";

export function DataTableBlock({ output }: { output: QueryDataOutput }) {
  return (
    <figure className="bg-card flex w-full flex-col overflow-hidden rounded-xl border" aria-label="Data result">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <figcaption className="flex items-center gap-2 text-sm font-medium">
          <TableIcon className="text-muted-foreground size-3.5" />
          Data result
        </figcaption>
        <span className="text-muted-foreground text-[11px] tabular-nums">
          {output.rows.length} of {output.totalRows} rows{output.truncated ? " · truncated" : ""}
        </span>
      </div>
      <div className="p-4">
        <ResultTable columns={output.columns} rows={output.rows} />
      </div>
    </figure>
  );
}
