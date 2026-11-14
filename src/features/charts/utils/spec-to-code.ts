import type { ChartSpec } from "@/features/charts/schema";
import type { ChartPayload } from "@/features/charts/types";
import { toChartConfig } from "@/features/charts/utils/to-chart-config";
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

const IMPORTS: Record<ChartPayload["type"], { component: string; module: string }> = {
  bar: { component: "EChartsBarChart", module: "echarts-bar-chart" },
  line: { component: "EChartsLineChart", module: "echarts-line-chart" },
  area: { component: "EChartsAreaChart", module: "echarts-area-chart" },
  pie: { component: "EChartsPieChart", module: "echarts-pie-chart" },
  radial: { component: "EChartsRadialChart", module: "echarts-radial-chart" },
  radar: { component: "EChartsRadarChart", module: "echarts-radar-chart" },
  composed: { component: "EChartsComposedChart", module: "echarts-composed-chart" },
  heatmap: { component: "EChartsHeatmapChart", module: "echarts-heatmap-chart" },
};

const previewRows = (payload: ChartPayload) => JSON.stringify(payload.rows.slice(0, 3), null, 2);

const fmt = (value: string | number | boolean | undefined | null): string => {
  if (value === undefined || value === null) return "undefined";
  if (typeof value === "string") return JSON.stringify(value);
  return String(value);
};

const children = (payload: ChartPayload) => {
  const root = IMPORTS[payload.type].component;

  if (payload.type === "pie") {
    const v = selectPieVariants(payload);
    return [
      `    <${root}.Tooltip />`,
      `    <${root}.Pie isClickable={${fmt(v.isClickable)}} innerRadius=${JSON.stringify(v.innerRadius)} outerRadius=${JSON.stringify(v.outerRadius)} paddingAngle={${v.paddingAngle}} cornerRadius={${v.cornerRadius}} startAngle={${v.startAngle}} endAngle={${v.endAngle}} />`,
      `    <${root}.Legend align="center" verticalAlign="bottom" isClickable={${payload.series.length > 1}} />`,
    ].join("\n");
  }

  if (payload.type === "radial") {
    const v = selectRadialVariants(payload);
    return [
      `    <${root}.RadialBar dataKey="value" barSize={${v.barSize}} cornerRadius={${v.cornerRadius}} showBackground={${fmt(v.showBackground)}} />`,
      `    <${root}.Tooltip />`,
      `    <${root}.Legend align="center" verticalAlign="bottom" />`,
    ].join("\n");
  }

  if (payload.type === "composed") {
    const v = selectComposedVariants(payload);
    const [barSeries, ...lineSeries] = payload.series;
    return [
      `    <${root}.Grid />`,
      `    <${root}.XAxis dataKey="${payload.xKey}" />`,
      `    <${root}.YAxis />`,
      `    <${root}.Tooltip />`,
      `    <${root}.Bar dataKey="${barSeries.key}" variant=${JSON.stringify(v.barVariant)} radius={${v.barRadius}} />`,
      ...lineSeries.map(
        (series) => `    <${root}.Line dataKey="${series.key}" strokeVariant=${JSON.stringify(v.lineStrokeVariant)} curveType=${JSON.stringify(v.lineCurveType)} />`,
      ),
    ].join("\n");
  }

  if (payload.type === "radar") {
    const v = selectRadarVariants(payload);
    return [
      `    <${root}.PolarGrid />`,
      `    <${root}.PolarAngleAxis dataKey="${payload.xKey}" />`,
      `    <${root}.PolarRadiusAxis />`,
      `    <${root}.Tooltip />`,
      ...payload.series.map((series) => `    <${root}.Radar dataKey="${series.key}" variant=${JSON.stringify(v.variant)} fillOpacity={${v.fillOpacity}} />`),
    ].join("\n");
  }

  if (payload.type === "heatmap") {
    const v = selectHeatmapVariants(payload);
    const seriesKey = payload.series[0]?.key ?? "value";
    return [
      `    <${root}.Cell dataKey="${seriesKey}" radius={${v.cellRadius}} gap={${v.cellGap}} isClickable={${fmt(v.isClickable)}} />`,
      `    <${root}.MonthLabel />`,
      `    <${root}.DayLabel />`,
      `    <${root}.Tooltip />`,
      `    <${root}.Legend lessLabel="Quiet" moreLabel="More" />`,
    ].join("\n");
  }

  return [
    `    <${root}.Grid />`,
    `    <${root}.XAxis dataKey="${payload.xKey}" hideDots />`,
    `    <${root}.YAxis />`,
    `    <${root}.Tooltip />`,
    ...(payload.series.length > 1
      ? [`    <${root}.Legend align="center" verticalAlign="bottom" isClickable />`]
      : []),
    ...payload.series.map((series) => {
      if (payload.type === "line") {
        const v = selectLineVariants(payload);
        return `    <${root}.Line dataKey="${series.key}" strokeVariant=${JSON.stringify(v.strokeVariant)} strokeWidth={${v.strokeWidth}} curveType=${JSON.stringify(v.curveType)} glowing={${fmt(v.glowing)}}>\n      <${root}.ActiveDot variant=${JSON.stringify(v.activeDotVariant)} />\n    </${root}.Line>`;
      }
      if (payload.type === "area") {
        const v = selectAreaVariants(payload);
        return `    <${root}.Area dataKey="${series.key}" variant=${JSON.stringify(v.variant)} strokeVariant=${JSON.stringify(v.strokeVariant)} strokeWidth={${v.strokeWidth}} curveType=${JSON.stringify(v.curveType)} glowing={${fmt(v.glowing)}}>\n      <${root}.ActiveDot variant=${JSON.stringify(v.activeDotVariant)} />\n    </${root}.Area>`;
      }
      const v = selectBarVariants(payload);
      return `    <${root}.Bar dataKey="${series.key}" variant=${JSON.stringify(v.variant)} radius={${v.barRadius}} glowing={${fmt(v.glowing)}} />`;
    }),
  ].join("\n");
};

export const specToCode = (spec: ChartSpec, payload: ChartPayload) => {
  const { component, module } = IMPORTS[payload.type];

  const rootProps = (() => {
    switch (payload.type) {
      case "pie": {
        const v = selectPieVariants(payload);
        return `dataKey="value" nameKey="name" innerRadius=${JSON.stringify(v.innerRadius)} outerRadius=${JSON.stringify(v.outerRadius)} paddingAngle={${v.paddingAngle}} cornerRadius={${v.cornerRadius}} startAngle={${v.startAngle}} endAngle={${v.endAngle}} isClickable={${fmt(v.isClickable)}}`;
      }
      case "radial": {
        const v = selectRadialVariants(payload);
        return `nameKey="name" variant=${JSON.stringify(v.variant)} max={${v.max}} innerRadius=${JSON.stringify(v.innerRadius)} outerRadius=${JSON.stringify(v.outerRadius)}`;
      }
      case "radar":
        return "";
      case "heatmap": {
        const v = selectHeatmapVariants(payload);
        return `range={2025} thresholds=${JSON.stringify(v.thresholds)} scale=${JSON.stringify(v.scale)} weekStart=${JSON.stringify(v.weekStart)}`;
      }
      case "line": {
        const v = selectLineVariants(payload);
        return `xDataKey="category" curveType=${JSON.stringify(v.curveType)} strokeVariant=${JSON.stringify(v.strokeVariant)} strokeWidth={${v.strokeWidth}} enableHoverHighlight={${fmt(v.enableHoverHighlight)}} glowing={${fmt(v.glowing)}}`;
      }
      case "area": {
        const v = selectAreaVariants(payload);
        return `xDataKey="category" curveType=${JSON.stringify(v.curveType)} stackType=${JSON.stringify(v.stackType)} strokeVariant=${JSON.stringify(v.strokeVariant)} strokeWidth={${v.strokeWidth}} enableHoverHighlight={${fmt(v.enableHoverHighlight)}} enableHoverReveal={${fmt(v.enableHoverReveal)}}`;
      }
      default: {
        const v = selectBarVariants(payload);
        const gap = v.barCategoryGap != null ? ` barCategoryGap={${v.barCategoryGap}}` : "";
        return `xDataKey="category" stackType=${JSON.stringify(v.stackType)} animation={true} barRadius={${v.barRadius}}${gap} enableMaxValueHighlight=${payload.series.length > 1}`;
      }
    }
  })();

  return `import { ${component} } from "@/components/evilcharts/charts/${module}";

// Chart spec — what the model produced
const spec = ${JSON.stringify(spec, null, 2)};

// Rows resolved on the server (first 3 of ${payload.rows.length})
const data = ${previewRows(payload)};

// Keys become --color-<key>-<n> CSS variables
const config = ${JSON.stringify(toChartConfig(payload), null, 2)};

export const ChartExample = () => (
  <${component} data={data} config={config} ${rootProps} className="h-[320px] w-full">
${children(payload)}
  </${component}>
);
`;
};
