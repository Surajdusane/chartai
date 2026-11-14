import type { ChartPayload } from "@/features/charts/types";

export const summarizeChart = (payload: ChartPayload) => {
  const series = payload.series.map((item) => item.label).join(", ");
  const first = payload.rows[0];
  const last = payload.rows.at(-1);

  return [
    `${payload.type} chart`,
    `x="${payload.xLabel}"`,
    `values=${series}`,
    `aggregation=${payload.meta.aggregation}`,
    `points=${payload.rows.length}`,
    first && last ? `first=${JSON.stringify(first)} last=${JSON.stringify(last)}` : "",
    payload.meta.truncated ? "truncated=true" : "",
  ]
    .filter(Boolean)
    .join(" | ");
};
