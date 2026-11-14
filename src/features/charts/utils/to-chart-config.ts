import type { ChartConfig } from "@/components/evilcharts/charts/echarts-bar-chart";
import type { ChartPayload } from "@/features/charts/types";

import { CHART_PALETTE } from "./palette";

export const toChartConfig = (payload: ChartPayload): ChartConfig => {
  const config: ChartConfig = {};

  payload.series.forEach((series, index) => {
    config[series.key] = {
      label: series.label,
      colors: CHART_PALETTE[index % CHART_PALETTE.length],
    };
  });

  return config;
};
