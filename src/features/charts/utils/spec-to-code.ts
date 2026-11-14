import type { ChartSpec } from "@/features/charts/schema";
import type { ChartPayload } from "@/features/charts/types";
import { toChartConfig } from "@/features/charts/utils/to-chart-config";

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

const children = (payload: ChartPayload) => {
  const root = IMPORTS[payload.type].component;

  if (payload.type === "pie") {
    return [
      `    <${root}.Tooltip />`,
      `    <${root}.Pie innerRadius="52%" outerRadius="92%" paddingAngle={2} isClickable />`,
      `    <${root}.Legend align="center" verticalAlign="bottom" isClickable />`,
    ].join("\n");
  }

  if (payload.type === "radial") {
    return [
      `    <${root}.RadialBar dataKey="value" barSize={12} cornerRadius={6} showBackground />`,
      `    <${root}.Tooltip />`,
      `    <${root}.Legend align="center" verticalAlign="bottom" />`,
    ].join("\n");
  }

  if (payload.type === "composed") {
    const [barSeries, ...lineSeries] = payload.series;
    return [
      `    <${root}.Grid />`,
      `    <${root}.XAxis dataKey="${payload.xKey}" />`,
      `    <${root}.YAxis />`,
      `    <${root}.Tooltip />`,
      `    <${root}.Bar dataKey="${barSeries.key}" variant="gradient" radius={4} />`,
      ...lineSeries.map(
        (series) => `    <${root}.Line dataKey="${series.key}" strokeVariant="solid" curveType="smooth" />`,
      ),
    ].join("\n");
  }

  if (payload.type === "radar") {
    return [
      `    <${root}.PolarGrid />`,
      `    <${root}.PolarAngleAxis dataKey="${payload.xKey}" />`,
      `    <${root}.PolarRadiusAxis />`,
      `    <${root}.Tooltip />`,
      ...payload.series.map((series) => `    <${root}.Radar dataKey="${series.key}" variant="filled" />`),
    ].join("\n");
  }

  if (payload.type === "heatmap") {
    const seriesKey = payload.series[0]?.key ?? "value";
    return [
      `    <${root}.Cell dataKey="${seriesKey}" radius={2} gap={3} isClickable />`,
      `    <${root}.MonthLabel />`,
      `    <${root}.DayLabel />`,
      `    <${root}.Tooltip />`,
      `    <${root}.Legend lessLabel="Less" moreLabel="More" />`,
    ].join("\n");
  }

  const seriesTag = payload.type === "line" ? "Line" : payload.type === "area" ? "Area" : "Bar";
  const seriesProps =
    payload.type === "line" ? ` strokeWidth={2}` : payload.type === "area" ? ` variant="gradient" strokeWidth={2}` : ` radius={4}`;

  return [
    `    <${root}.Grid />`,
    `    <${root}.XAxis dataKey="${payload.xKey}" hideDots />`,
    `    <${root}.YAxis />`,
    `    <${root}.Tooltip />`,
    ...(payload.series.length > 1
      ? [`    <${root}.Legend align="center" verticalAlign="bottom" isClickable />`]
      : []),
    ...payload.series.map((series) => `    <${root}.${seriesTag} dataKey="${series.key}"${seriesProps} />`),
  ].join("\n");
};

export const specToCode = (spec: ChartSpec, payload: ChartPayload) => {
  const { component, module } = IMPORTS[payload.type];

  // Mirror the root props the renderer actually passes — each chart's root
  // accepts a different subset (radar takes none, radial no dataKey, …).
  const rootProps = (() => {
    switch (payload.type) {
      case "pie":
        return `dataKey="value" nameKey="name"`;
      case "radial":
        return `nameKey="name" innerRadius="35%" outerRadius="95%"`;
      case "radar":
        return "";
      case "heatmap":
        return "";
      default:
        return `xDataKey="category"`;
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
