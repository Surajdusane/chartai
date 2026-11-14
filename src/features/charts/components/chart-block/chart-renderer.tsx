"use client";

import { useMemo } from "react";

import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { EChartsBarChart } from "@/components/evilcharts/charts/echarts-bar-chart";
import { EChartsComposedChart } from "@/components/evilcharts/charts/echarts-composed-chart";
import { EChartsLineChart } from "@/components/evilcharts/charts/echarts-line-chart";
import { EChartsPieChart } from "@/components/evilcharts/charts/echarts-pie-chart";
import { EChartsRadarChart } from "@/components/evilcharts/charts/echarts-radar-chart";
import { EChartsRadialChart } from "@/components/evilcharts/charts/echarts-radial-chart";
import type { ChartPayload } from "@/features/charts/types";
import { toChartConfig } from "@/features/charts/utils/to-chart-config";
import { useMediaQuery } from "@/hooks/use-media-query";

export function ChartRenderer({ payload }: { payload: ChartPayload }) {
  const config = useMemo(() => toChartConfig(payload), [payload]);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const animation = !reduceMotion;

  if (payload.type === "pie") {
    return (
      <EChartsPieChart
        data={payload.rows}
        config={config}
        dataKey="value"
        nameKey="name"
        className="h-full w-full"
        animation={animation}
      >
        <EChartsPieChart.Tooltip />
        <EChartsPieChart.Pie isClickable innerRadius="52%" outerRadius="92%" paddingAngle={2} />
        <EChartsPieChart.Legend align="center" verticalAlign="bottom" isClickable />
      </EChartsPieChart>
    );
  }

  if (payload.type === "radial") {
    const max = Math.max(...payload.rows.map((row) => Number(row.value) || 0), 1);

    return (
      <EChartsRadialChart
        data={payload.rows}
        config={config}
        nameKey="name"
        max={max}
        innerRadius="35%"
        outerRadius="95%"
        className="h-full w-full"
      >
        <EChartsRadialChart.RadialBar dataKey="value" barSize={12} cornerRadius={6} showBackground />
        <EChartsRadialChart.Tooltip />
        <EChartsRadialChart.Legend align="center" verticalAlign="bottom" />
      </EChartsRadialChart>
    );
  }

  const hasManySeries = payload.series.length > 1;

  if (payload.type === "line") {
    return (
      <EChartsLineChart
        data={payload.rows}
        config={config}
        xDataKey="category"
        className="h-full w-full"
        curveType="smooth"
        animation={animation}
      >
        <EChartsLineChart.Grid />
        <EChartsLineChart.XAxis dataKey="category" hideDots />
        <EChartsLineChart.YAxis />
        <EChartsLineChart.Tooltip />
        {hasManySeries ? <EChartsLineChart.Legend align="center" verticalAlign="bottom" isClickable /> : null}
        {payload.series.map((series) => (
          <EChartsLineChart.Line key={series.key} dataKey={series.key} strokeWidth={2}>
            <EChartsLineChart.ActiveDot />
          </EChartsLineChart.Line>
        ))}
      </EChartsLineChart>
    );
  }

  if (payload.type === "area") {
    return (
      <EChartsAreaChart
        data={payload.rows}
        config={config}
        xDataKey="category"
        className="h-full w-full"
        curveType="smooth"
        animation={animation}
        stackType={payload.stacked && payload.series.length > 1 ? "stacked" : "default"}
      >
        <EChartsAreaChart.Grid />
        <EChartsAreaChart.XAxis dataKey="category" hideDots />
        <EChartsAreaChart.YAxis />
        <EChartsAreaChart.Tooltip />
        {hasManySeries ? <EChartsAreaChart.Legend align="center" verticalAlign="bottom" isClickable /> : null}
        {payload.series.map((series) => (
          <EChartsAreaChart.Area key={series.key} dataKey={series.key} variant="gradient" strokeWidth={2} />
        ))}
      </EChartsAreaChart>
    );
  }

  if (payload.type === "radar") {
    return (
      <EChartsRadarChart data={payload.rows} config={config} className="h-full w-full" animation={animation}>
        <EChartsRadarChart.PolarGrid />
        <EChartsRadarChart.PolarAngleAxis dataKey="category" />
        <EChartsRadarChart.PolarRadiusAxis />
        <EChartsRadarChart.Tooltip />
        {hasManySeries ? <EChartsRadarChart.Legend align="center" verticalAlign="bottom" /> : null}
        {payload.series.map((series) => (
          <EChartsRadarChart.Radar key={series.key} dataKey={series.key} variant="filled" fillOpacity={0.25} />
        ))}
      </EChartsRadarChart>
    );
  }

  if (payload.type === "composed") {
    const [barSeries, ...lineSeries] = payload.series;

    return (
      <EChartsComposedChart
        data={payload.rows}
        config={config}
        xDataKey="category"
        className="h-full w-full"
        animation={animation}
      >
        <EChartsComposedChart.Grid />
        <EChartsComposedChart.XAxis dataKey="category" hideDots />
        <EChartsComposedChart.YAxis />
        <EChartsComposedChart.Tooltip />
        {hasManySeries ? <EChartsComposedChart.Legend align="center" verticalAlign="bottom" isClickable /> : null}
        <EChartsComposedChart.Bar dataKey={barSeries.key} variant="gradient" radius={4} />
        {lineSeries.map((series) => (
          <EChartsComposedChart.Line key={series.key} dataKey={series.key} strokeVariant="solid" curveType="smooth" />
        ))}
      </EChartsComposedChart>
    );
  }

  return (
    <EChartsBarChart
      data={payload.rows}
      config={config}
      xDataKey="category"
      className="h-full w-full"
      stackType={payload.stacked ? "stacked" : "default"}
      animation={animation}
    >
      <EChartsBarChart.Grid />
      <EChartsBarChart.XAxis dataKey="category" hideDots />
      <EChartsBarChart.YAxis />
      <EChartsBarChart.Tooltip />
      {hasManySeries ? <EChartsBarChart.Legend align="center" verticalAlign="bottom" isClickable /> : null}
      {payload.series.map((series) => (
        <EChartsBarChart.Bar key={series.key} dataKey={series.key} radius={4} />
      ))}
    </EChartsBarChart>
  );
}
