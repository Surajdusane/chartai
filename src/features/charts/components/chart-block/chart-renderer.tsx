"use client";

import { useMemo } from "react";

import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { EChartsBarChart } from "@/components/evilcharts/charts/echarts-bar-chart";
import { EChartsComposedChart } from "@/components/evilcharts/charts/echarts-composed-chart";
import { EChartsHeatmapChart } from "@/components/evilcharts/charts/echarts-heatmap-chart";
import { EChartsLineChart } from "@/components/evilcharts/charts/echarts-line-chart";
import { EChartsPieChart } from "@/components/evilcharts/charts/echarts-pie-chart";
import { EChartsRadarChart } from "@/components/evilcharts/charts/echarts-radar-chart";
import { EChartsRadialChart } from "@/components/evilcharts/charts/echarts-radial-chart";
import type { ChartPayload } from "@/features/charts/types";
import {
  selectAreaVariants,
  selectBarVariants,
  selectComposedVariants,
  selectHeatmapVariants,
  selectLineVariants,
  selectPieVariants,
  selectRadarVariants,
  selectRadialVariants,
} from "@/features/charts/utils/chart-variants";
import { toChartConfig } from "@/features/charts/utils/to-chart-config";
import { useMediaQuery } from "@/hooks/use-media-query";

export function ChartRenderer({ payload }: { payload: ChartPayload }) {
  const config = useMemo(() => toChartConfig(payload), [payload]);

  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const animation = !reduceMotion;
  const hasManySeries = payload.series.length > 1;

  if (payload.type === "pie") {
    const variants = selectPieVariants(payload);
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
        <EChartsPieChart.Pie
          isClickable={variants.isClickable}
          innerRadius={variants.innerRadius}
          outerRadius={variants.outerRadius}
          paddingAngle={variants.paddingAngle}
          cornerRadius={variants.cornerRadius}
          startAngle={variants.startAngle}
          endAngle={variants.endAngle}
        />
        <EChartsPieChart.Legend align="center" verticalAlign="bottom" isClickable={hasManySeries} />
      </EChartsPieChart>
    );
  }

  if (payload.type === "radial") {
    const variants = selectRadialVariants(payload);
    return (
      <EChartsRadialChart
        data={payload.rows}
        config={config}
        nameKey="name"
        variant={variants.variant}
        max={variants.max}
        innerRadius={variants.innerRadius}
        outerRadius={variants.outerRadius}
        className="h-full w-full"
      >
        <EChartsRadialChart.RadialBar
          dataKey="value"
          barSize={variants.barSize}
          cornerRadius={variants.cornerRadius}
          showBackground={variants.showBackground}
        />
        <EChartsRadialChart.Tooltip />
        <EChartsRadialChart.Legend align="center" verticalAlign="bottom" />
      </EChartsRadialChart>
    );
  }

  if (payload.type === "heatmap") {
    const seriesKey = payload.series[0]?.key ?? "value";
    const variants = selectHeatmapVariants(payload);
    return (
      <EChartsHeatmapChart
        data={payload.rows.map((row) => ({
          date: String(row[payload.xKey ?? "category"]),
          value: Number(row[seriesKey]) || 0,
        }))}
        config={{
          [seriesKey]: {
            label: payload.series[0]?.label ?? seriesKey,
          },
        }}
        className="h-full w-full"
        animation={animation}
        range={2025}
        thresholds={variants.thresholds}
        scale={variants.scale}
        weekStart={variants.weekStart}
      >
        <EChartsHeatmapChart.Cell
          dataKey={seriesKey}
          radius={variants.cellRadius}
          gap={variants.cellGap}
          isClickable={variants.isClickable}
        />
        <EChartsHeatmapChart.MonthLabel />
        <EChartsHeatmapChart.DayLabel />
        <EChartsHeatmapChart.Tooltip />
        <EChartsHeatmapChart.Legend lessLabel="Quiet" moreLabel="More" />
      </EChartsHeatmapChart>
    );
  }

  if (payload.type === "line") {
    const variants = selectLineVariants(payload);
    return (
      <EChartsLineChart
        data={payload.rows}
        config={config}
        xDataKey="category"
        className="h-full w-full"
        curveType={variants.curveType}
        animation={animation}
        enableHoverHighlight={variants.enableHoverHighlight}
      >
        <EChartsLineChart.Grid />
        <EChartsLineChart.XAxis dataKey="category" hideDots />
        <EChartsLineChart.YAxis />
        <EChartsLineChart.Tooltip variant="frosted-glass" />
        {hasManySeries ? (
          <EChartsLineChart.Legend align="center" verticalAlign="bottom" isClickable />
        ) : null}
        {payload.series.map((series) => (
          <EChartsLineChart.Line
            key={series.key}
            dataKey={series.key}
            strokeVariant={variants.strokeVariant}
            strokeWidth={variants.strokeWidth}
            curveType={variants.curveType}
            glowing={variants.glowing}
          >
            <EChartsLineChart.ActiveDot variant={variants.activeDotVariant} />
          </EChartsLineChart.Line>
        ))}
      </EChartsLineChart>
    );
  }

  if (payload.type === "area") {
    const variants = selectAreaVariants(payload);
    return (
      <EChartsAreaChart
        data={payload.rows}
        config={config}
        xDataKey="category"
        className="h-full w-full"
        curveType={variants.curveType}
        animation={animation}
        stackType={variants.stackType as "default" | "stacked" | "expanded"}
        enableHoverHighlight={variants.enableHoverHighlight}
        enableHoverReveal={variants.enableHoverReveal}
      >
        <EChartsAreaChart.Grid />
        <EChartsAreaChart.XAxis dataKey="category" hideDots />
        <EChartsAreaChart.YAxis />
        <EChartsAreaChart.Tooltip variant="frosted-glass" />
        {hasManySeries ? (
          <EChartsAreaChart.Legend align="center" verticalAlign="bottom" isClickable />
        ) : null}
        {payload.series.map((series) => (
          <EChartsAreaChart.Area
            key={series.key}
            dataKey={series.key}
            variant={variants.variant}
            strokeVariant={variants.strokeVariant}
            strokeWidth={variants.strokeWidth}
            curveType={variants.curveType}
          >
            <EChartsAreaChart.ActiveDot variant={variants.activeDotVariant} />
          </EChartsAreaChart.Area>
        ))}
      </EChartsAreaChart>
    );
  }

  if (payload.type === "radar") {
    const variants = selectRadarVariants(payload);
    return (
      <EChartsRadarChart data={payload.rows} config={config} className="h-full w-full" animation={animation}>
        <EChartsRadarChart.PolarGrid />
        <EChartsRadarChart.PolarAngleAxis dataKey="category" />
        <EChartsRadarChart.PolarRadiusAxis />
        <EChartsRadarChart.Tooltip />
        {hasManySeries ? <EChartsRadarChart.Legend align="center" verticalAlign="bottom" /> : null}
        {payload.series.map((series) => (
          <EChartsRadarChart.Radar
            key={series.key}
            dataKey={series.key}
            variant={variants.variant}
            fillOpacity={variants.fillOpacity}
          />
        ))}
      </EChartsRadarChart>
    );
  }

  if (payload.type === "composed") {
    const variants = selectComposedVariants(payload);
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
        {hasManySeries ? (
          <EChartsComposedChart.Legend align="center" verticalAlign="bottom" isClickable />
        ) : null}
        <EChartsComposedChart.Bar dataKey={barSeries.key} variant={variants.barVariant} radius={variants.barRadius} />
        {lineSeries.map((series) => (
          <EChartsComposedChart.Line
            key={series.key}
            dataKey={series.key}
            strokeVariant={variants.lineStrokeVariant}
            curveType={variants.lineCurveType}
          />
        ))}
      </EChartsComposedChart>
    );
  }

  const variants = selectBarVariants(payload);
  return (
    <EChartsBarChart
      data={payload.rows}
      config={config}
      xDataKey="category"
      className="h-full w-full"
      stackType={variants.stackType as "default" | "stacked" | "percent"}
      animation={animation}
      barRadius={variants.barRadius}
      barCategoryGap={variants.barCategoryGap}
      enableMaxValueHighlight={hasManySeries}
    >
      <EChartsBarChart.Grid />
      <EChartsBarChart.XAxis dataKey="category" hideDots />
      <EChartsBarChart.YAxis />
      <EChartsBarChart.Tooltip />
      {hasManySeries ? (
        <EChartsBarChart.Legend align="center" verticalAlign="bottom" isClickable />
      ) : null}
      {payload.series.map((series) => (
        <EChartsBarChart.Bar
          key={series.key}
          dataKey={series.key}
          variant={variants.variant}
          radius={variants.barRadius}
          glowing={variants.glowing}
        />
      ))}
    </EChartsBarChart>
  );
}
