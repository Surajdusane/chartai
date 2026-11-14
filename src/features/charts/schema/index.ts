import { z } from "zod";

export const chartTypeSchema = z.enum([
  "bar",
  "line",
  "area",
  "pie",
  "radial",
  "radar",
  "composed",
]);

export const chartAggregationSchema = z.enum(["sum", "avg", "count", "min", "max", "none"]);

export const chartSortSchema = z.enum(["x-asc", "x-desc", "value-asc", "value-desc", "none"]);

export const chartSpecSchema = z.object({
  type: chartTypeSchema.describe(
    "bar = compare categories; line/area = trend over time or an ordered axis; pie/radial = parts of one whole; radar = compare 2-3 metrics across few categories; composed = bars plus a line.",
  ),
  title: z.string().trim().min(1).max(80).describe("Short chart title, sentence case."),
  subtitle: z.string().trim().max(160).optional().describe("Optional one-line takeaway."),
  x: z
    .string()
    .min(1)
    .describe("Category column name, copied exactly from the dataset profile."),
  y: z
    .array(z.string().min(1))
    .min(1)
    .max(3)
    .describe("1-3 numeric column names, copied exactly. Pie and radial accept exactly one."),
  aggregation: chartAggregationSchema
    .optional()
    .describe("How to combine rows that share the same x value. Defaults to sum. Use count to count rows."),
  sort: chartSortSchema
    .optional()
    .describe("Defaults to x-asc for line/area/radar and value-desc for everything else."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(40)
    .optional()
    .describe("Max categories to draw. Defaults to 12 (24 for line/area)."),
  stacked: z.boolean().optional().describe("Stack multi-series bars/areas. Defaults to false."),
  unit: z
    .string()
    .max(6)
    .optional()
    .describe('Short unit suffix for the value axis, e.g. "$", "%", "kg". Only when the profile shows one.'),
});

export type ChartType = z.infer<typeof chartTypeSchema>;
export type ChartAggregation = z.infer<typeof chartAggregationSchema>;
export type ChartSort = z.infer<typeof chartSortSchema>;
export type ChartSpec = z.infer<typeof chartSpecSchema>;
