import { tool } from "ai";

import type { ColumnProfile, DatasetRow } from "@/db/schema";
import { chartSpecSchema } from "@/features/charts/schema";
import { ChartSpecError, resolveChartSpec } from "@/features/charts/server/resolve-chart-spec";
import { summarizeChart } from "@/features/charts/server/summarize-chart";

import { queryDataInputSchema, QueryDataError, runQuery } from "./query-data";

type DatasetContext = {
  columns: ColumnProfile[];
  rows: DatasetRow[];
};

const summarizeRows = (output: {
  columns: string[];
  rows: Array<Array<string | number | null>>;
  totalRows: number;
  truncated: boolean;
}) => {
  const header = output.columns.join(" | ");
  const body = output.rows
    .slice(0, 20)
    .map((row) => row.map((cell) => (cell === null ? "" : String(cell))).join(" | "))
    .join("\n");

  return `columns: ${header}\nrows: ${output.rows.length} of ${output.totalRows}${output.truncated ? " (truncated)" : ""}\n${body}`;
};

export const createChatTools = (dataset: DatasetContext) => ({
  renderChart: tool({
    description:
      "Render an interactive chart from the uploaded dataset. Call this for any chart or graph request. Returns a resolved chart; do not repeat the data in text.",
    inputSchema: chartSpecSchema,
    execute: async (spec) => {
      try {
        const payload = resolveChartSpec({ spec, columns: dataset.columns, rows: dataset.rows });
        return { spec, payload };
      } catch (error) {
        if (error instanceof ChartSpecError) throw new Error(error.message);
        throw error;
      }
    },
    toModelOutput: ({ output }) => ({ type: "text", value: summarizeChart(output.payload) }),
  }),

  queryData: tool({
    description:
      "Read exact rows, totals, or groupings from the dataset. Use it when the answer needs specific numbers or a short list. Never request more than 100 rows.",
    inputSchema: queryDataInputSchema,
    execute: async (query) => {
      try {
        return runQuery({ query, columns: dataset.columns, rows: dataset.rows });
      } catch (error) {
        if (error instanceof QueryDataError) throw new Error(error.message);
        throw error;
      }
    },
    toModelOutput: ({ output }) => ({ type: "text", value: summarizeRows(output) }),
  }),
});

export type ChatTools = ReturnType<typeof createChatTools>;
