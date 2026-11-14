import { z } from "zod";

import { chartSpecSchema } from "@/features/charts/schema";

export const chartPayloadSchema = z.object({
  type: chartSpecSchema.shape.type,
  xLabel: z.string(),
  valueLabel: z.string(),
  xKey: z.enum(["category", "name"]),
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
  series: z.array(z.object({ key: z.string(), label: z.string() })),
  stacked: z.boolean(),
  table: z.object({
    columns: z.array(z.string()),
    rows: z.array(z.array(z.union([z.string(), z.number()]))),
  }),
  meta: z.object({
    aggregation: z.enum(["sum", "avg", "count", "min", "max", "none"]),
    inputRows: z.number(),
    groups: z.number(),
    truncated: z.boolean(),
  }),
});

export const renderChartOutputSchema = z.object({
  spec: chartSpecSchema,
  payload: chartPayloadSchema,
});

export const parseRenderChartOutput = (value: unknown) => {
  const result = renderChartOutputSchema.safeParse(value);
  return result.success ? result.data : null;
};
