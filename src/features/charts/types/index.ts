import type { ChartAggregation, ChartSpec, ChartType } from "@/features/charts/schema";

export type ChartSeries = {
  /** CSS-safe key used by the chart + config. Never contains spaces or punctuation. */
  key: string;
  /** Original column or category name shown to the user. */
  label: string;
};

export type ChartPayload = {
  type: ChartType;
  /** Display label for the category axis (original column name). */
  xLabel: string;
  /** Display label for the value axis, including the unit when known. */
  valueLabel: string;
  /** Which key the chart root must use for categories. */
  xKey: "category" | "name";
  /** Exactly the rows the chart component receives. */
  rows: Array<Record<string, string | number>>;
  /** Series / sector metadata, in draw order. */
  series: ChartSeries[];
  /** True when multi-series bars/areas were stacked by the spec. */
  stacked: boolean;
  /** Readable rows for the Data tab (no slugs). */
  table: {
    columns: string[];
    rows: Array<Array<string | number>>;
  };
  meta: {
    aggregation: ChartAggregation;
    inputRows: number;
    groups: number;
    truncated: boolean;
  };
};

export type RenderChartOutput = {
  spec: ChartSpec;
  payload: ChartPayload;
};
