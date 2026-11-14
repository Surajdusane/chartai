"use client";

import type { ChartPayload } from "@/features/charts/types";

import { ResultTable } from "../result-table";

export function ChartDataTable({ payload }: { payload: ChartPayload }) {
  return <ResultTable columns={payload.table.columns} rows={payload.table.rows} />;
}
