# 06 — Chart templates, spec resolver, and `ChartBlock`

Read `AGENTS.md` at the repository root first and strictly follow it.

> Step 6 of 9. Step 05 is complete: the chat renders stored messages and the composer works with a temporary stub. No AI yet.

## Goal

Build everything needed to turn a **tiny chart spec** into a rendered evilcharts chart with visible component code. This is the core token-optimization layer:

1. A zod `chartSpecSchema` — the ONLY thing the model emits for charts (~10 short fields, never data/JSX/ECharts options).
2. A resolver that reads dataset rows on the server and produces a **ready-to-render payload** (no JSX, no row data sent to the model).
3. Seven template renderers built only from `src/components/evilcharts`.
4. A `ChartBlock` with Chart / Data / Code tabs, skeleton, and error states — the Code tab shows the equivalent evilcharts JSX as a **visible component code block** in the response.
5. A generated-code view so the user can see and copy the exact component code.

## Token optimization (critical requirement)

- The model outputs a spec of ~10 short fields. It never outputs rows, JSX, colors, or config objects.
- The server resolves rows and aggregation deterministically, so the same spec always produces the same chart.
- The payload is stored inside the tool output part, so charts re-render on reload with no extra request.

## Token optimization (critical)

This step is the heart of the token budget. The model must never pay for rows, JSX, colors, or ECharts config — it pays for a ~10-field spec and the server resolves everything:

1. **Spec is the only model output for charts.** `chartSpecSchema` is ~10 short fields: `type`, `title`, `subtitle` (optional), `x`, `y` (1–3 columns), `aggregation` (optional), `sort` (optional), `limit` (optional), `stacked` (optional), `unit` (optional). Optional fields have no `.default()` — the resolver applies defaults per chart type, so the model is never forced to emit them.
2. **No rows to the model, ever.** `resolveChartSpec` runs server-side against `dataset.rows`. The model only ever sees the capped column profile in the system prompt and the short `summarizeChart`/`summarizeRows` text from `toModelOutput`.
3. **Templates, not config.** The seven renderers in `chart-renderer.tsx` are fixed evilcharts compositions. The payload carries only resolved rows + series metadata + a small table copy. No JSX, no ECharts options, no colors are generated from model output.
4. **Component code is generated locally.** `specToCode` builds the equivalent evilcharts JSX from the stored spec + payload. The Code tab shows this **component code block** to the user (read-only, copyable), but it is never transmitted from the server and never sent to the model.
5. **Payload is stored, not re-fetched.** The resolved payload lives inside the tool output part, so charts re-render on reload with zero extra requests and zero extra tokens.
6. **Defaults reduce spec size.** `aggregation`, `sort`, `limit`, `stacked`, `unit` are all optional. The resolver fills sensible per-type defaults, so the model can emit `{ type: "bar", title: "Revenue", x: "Region", y: ["Revenue"] }` and get a complete chart.
7. **Tool outputs are summaries.** `summarizeChart` is ~40 words. `summarizeRows` caps at 20 preview rows. The full payload is never sent back to the model.

## Do not

- Do not let the model emit JSX, HTML, ECharts options, or row data.
- Do not import any chart library other than the installed evilcharts components (`src/components/evilcharts`).
- Do not add a chart route or tRPC procedure in this step.
- Do not change the resolver into something that calls the model. It is pure TypeScript.

## 1. Feature layout

Create:

```
src/features/charts/
  schema/index.ts
  types/index.ts
  utils/series-key.ts
  utils/palette.ts
  utils/to-chart-config.ts
  utils/spec-to-code.ts
  utils/guard.ts
  server/resolve-chart-spec.ts
  server/summarize-chart.ts
  components/chart-block/index.tsx
  components/chart-block/chart-renderer.tsx
  components/chart-block/chart-data-table.tsx
  components/chart-block/chart-code.tsx
  components/chart-block/chart-skeleton.tsx
  components/result-table.tsx
  index.ts
```

`index.ts` exports only the components, schema, types, and client-safe utils. Never export `server/` from the barrel.

## 2. Chart spec schema

`src/features/charts/schema/index.ts`:

```ts
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
```

Note: `aggregation`, `sort`, `limit`, and `stacked` are optional on purpose. Their defaults depend on the chart type, so the resolver applies them. Do not use `.default()` here — it would force the model to emit them.

## 3. Payload types

`src/features/charts/types/index.ts`:

```ts
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
```

## 4. Series keys

Chart config keys become CSS custom properties (`--color-<key>-0`), so they must be CSS-safe. Pie and radial configs are keyed by the sector `name`, which means sector names are slugs too and the human label lives in `config[key].label`.

`src/features/charts/utils/series-key.ts`:

```ts
const MAX_KEY_LENGTH = 32;

/** Lowercase, ASCII, underscore-separated, never starting with a digit. */
export const slugifyKey = (value: string) => {
  const base = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_KEY_LENGTH);

  const safe = base.length > 0 ? base : "series";
  return /^[0-9]/.test(safe) ? `s_${safe}` : safe;
};

/** Returns a key that is unique within `used` (and records it). */
export const uniqueKey = (value: string, used: Set<string>) => {
  const base = slugifyKey(value);
  let key = base;
  let suffix = 2;
  while (used.has(key)) {
    key = `${base}_${suffix}`;
    suffix += 1;
  }
  used.add(key);
  return key;
};

/** Maps original column names to stable, unique series keys. */
export const toSeriesKeys = (labels: string[]) => {
  const used = new Set<string>();
  const map = new Map<string, string>();
  for (const label of labels) {
    map.set(label, uniqueKey(label, used));
  }
  return map;
};
```

## 5. Palette

`src/features/charts/utils/palette.ts`:

```ts
import type { ChartConfig } from "@/components/evilcharts/charts/echarts-bar-chart";

export const CHART_PALETTE: ReadonlyArray<NonNullable<ChartConfig[string]["colors"]>> = [
  { light: ["#2563eb"], dark: ["#60a5fa"] },
  { light: ["#0d9488"], dark: ["#2dd4bf"] },
  { light: ["#d97706"], dark: ["#fbbf24"] },
  { light: ["#7c3aed"], dark: ["#a78bfa"] },
  { light: ["#e11d48"], dark: ["#fb7185"] },
  { light: ["#0891b2"], dark: ["#22d3ee"] },
  { light: ["#65a30d"], dark: ["#a3e635"] },
  { light: ["#ea580c"], dark: ["#fb923c"] },
  { light: ["#475569"], dark: ["#94a3b8"] },
];
```

## 6. Resolver

`src/features/charts/server/resolve-chart-spec.ts`:

```ts
import type { ColumnProfile, DatasetRow, DatasetValue } from "@/db/schema";
import type { ChartAggregation, ChartSort, ChartSpec, ChartType } from "@/features/charts/schema";
import type { ChartPayload, ChartSeries } from "@/features/charts/types";
import { toSeriesKeys, uniqueKey } from "@/features/charts/utils/series-key";

export class ChartSpecError extends Error {}

const BLANK = "(blank)";
const DEFAULT_LIMIT: Record<ChartType, number> = {
  bar: 12,
  line: 24,
  area: 24,
  pie: 10,
  radial: 10,
  radar: 12,
  composed: 12,
};

const toCategory = (value: DatasetValue): string => {
  if (value === null || value === undefined || value === "") return BLANK;
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
};

const toNumber = (value: DatasetValue): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const round = (value: number) => Math.round(value * 10_000) / 10_000;

const combine = (values: number[], aggregation: ChartAggregation, rowCount: number): number => {
  if (aggregation === "count") return rowCount;
  if (values.length === 0) return 0;

  switch (aggregation) {
    case "sum":
      return round(values.reduce((total, value) => total + value, 0));
    case "avg":
      return round(values.reduce((total, value) => total + value, 0) / values.length);
    case "min":
      return round(Math.min(...values));
    case "max":
      return round(Math.max(...values));
    case "none":
      return round(values[0]);
  }
};

const defaultSort = (type: ChartType): ChartSort =>
  type === "line" || type === "area" || type === "radar" ? "x-asc" : "value-desc";

const compareStrings = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

type Group = {
  category: string;
  rowCount: number;
  values: Map<string, number[]>;
};

export function resolveChartSpec(input: {
  spec: ChartSpec;
  columns: ColumnProfile[];
  rows: DatasetRow[];
}): ChartPayload {
  const { spec, columns, rows } = input;

  const columnByName = new Map(columns.map((column) => [column.name, column]));
  const xColumn = columnByName.get(spec.x);
  if (!xColumn) {
    throw new ChartSpecError(
      `Unknown x column "${spec.x}". Available columns: ${columns.map((column) => column.name).join(", ")}.`,
    );
  }

  if ((spec.type === "pie" || spec.type === "radial") && spec.y.length !== 1) {
    throw new ChartSpecError(`${spec.type} charts need exactly one y column.`);
  }

  if (spec.type === "composed" && spec.y.length < 2) {
    throw new ChartSpecError("composed charts need at least two y columns: the first draws bars, the rest draw lines.");
  }

  const yColumns = spec.y.map((name) => {
    const column = columnByName.get(name);
    if (!column) {
      throw new ChartSpecError(
        `Unknown y column "${name}". Available columns: ${columns.map((item) => item.name).join(", ")}.`,
      );
    }
    if (column.type !== "number") {
      throw new ChartSpecError(
        `"${name}" is a ${column.type} column. Aggregations only work on number columns; use a number column or aggregation "count".`,
      );
    }
    return column;
  });

  const aggregation = spec.aggregation ?? "sum";
  const sort = spec.sort ?? defaultSort(spec.type);
  const limit = spec.limit ?? DEFAULT_LIMIT[spec.type];

  if ((spec.type === "pie" || spec.type === "radial") && aggregation === "none") {
    throw new ChartSpecError(`${spec.type} charts need an aggregation; use sum, avg, count, min, or max.`);
  }

  const keyByLabel = toSeriesKeys(yColumns.map((column) => column.name));
  const series: ChartSeries[] = yColumns.map((column) => ({
    key: keyByLabel.get(column.name) ?? column.name,
    label: column.name,
  }));

  const unit = spec.unit?.trim();
  const valueLabel = unit
    ? `${yColumns.map((column) => column.name).join(", ")} (${unit})`
    : yColumns.map((column) => column.name).join(", ");

  if (aggregation === "none") {
    const limited = rows.slice(0, limit);
    const chartRows = limited.map((row) => {
      const entry: Record<string, string | number> = { category: toCategory(row[spec.x]) };
      for (const item of series) {
        const column = yColumns.find((candidate) => candidate.name === item.label);
        entry[item.key] = round(toNumber(row[column?.name ?? ""]) ?? 0);
      }
      return entry;
    });

    return {
      type: spec.type,
      xLabel: spec.x,
      valueLabel,
      xKey: "category",
      rows: chartRows,
      series,
      stacked: false,
      table: {
        columns: [spec.x, ...series.map((item) => item.label)],
        rows: chartRows.map((row) => [String(row.category), ...series.map((item) => Number(row[item.key]))]),
      },
      meta: {
        aggregation,
        inputRows: rows.length,
        groups: chartRows.length,
        truncated: rows.length > limited.length,
      },
    };
  }

  const groups = new Map<string, Group>();
  for (const row of rows) {
    const category = toCategory(row[spec.x]);
    let group = groups.get(category);
    if (!group) {
      group = { category, rowCount: 0, values: new Map() };
      groups.set(category, group);
    }

    group.rowCount += 1;
    for (const item of series) {
      const numeric = toNumber(row[item.label]);
      if (numeric === null) continue;
      const bucket = group.values.get(item.key) ?? [];
      bucket.push(numeric);
      group.values.set(item.key, bucket);
    }
  }

  type ResolvedGroup = {
    category: string;
    values: Record<string, number>;
    total: number;
  };

  const resolved: ResolvedGroup[] = [...groups.values()].map((group) => {
    const values: Record<string, number> = {};
    for (const item of series) {
      values[item.key] = combine(group.values.get(item.key) ?? [], aggregation, group.rowCount);
    }
    const total = series.reduce((sum, item) => sum + (values[item.key] ?? 0), 0);
    return { category: group.category, values, total };
  });

  switch (sort) {
    case "x-asc":
      resolved.sort((a, b) => compareStrings(a.category, b.category));
      break;
    case "x-desc":
      resolved.sort((a, b) => compareStrings(b.category, a.category));
      break;
    case "value-asc":
      resolved.sort((a, b) => a.total - b.total);
      break;
    case "value-desc":
      resolved.sort((a, b) => b.total - a.total);
      break;
    case "none":
      break;
  }

  const truncated = resolved.length > limit;
  const limited = resolved.slice(0, limit);

  if (limited.length === 0) {
    throw new ChartSpecError("No rows are available for this chart.");
  }

  if (spec.type === "pie" || spec.type === "radial") {
    const positive = limited.filter((group) => (group.values[series[0].key] ?? 0) > 0);
    if (positive.length === 0) {
      throw new ChartSpecError("All aggregated values are zero or negative, so a part-to-whole chart cannot be drawn.");
    }

    const used = new Set<string>();
    const sectorSeries: ChartSeries[] = [];
    const chartRows = positive.map((group) => {
      const key = uniqueKey(group.category === BLANK ? "blank" : group.category, used);
      sectorSeries.push({ key, label: group.category });
      return { name: key, value: group.values[series[0].key] ?? 0 };
    });

    return {
      type: spec.type,
      xLabel: spec.x,
      valueLabel,
      xKey: "name",
      rows: chartRows,
      series: sectorSeries,
      stacked: false,
      table: {
        columns: [spec.x, valueLabel],
        rows: positive.map((group) => [group.category, group.values[series[0].key] ?? 0]),
      },
      meta: {
        aggregation,
        inputRows: rows.length,
        groups: groups.size,
        truncated,
      },
    };
  }

  const chartRows = limited.map((group) => ({ category: group.category, ...group.values }));

  return {
    type: spec.type,
    xLabel: spec.x,
    valueLabel,
    xKey: "category",
    rows: chartRows,
    series,
    stacked: spec.stacked ?? false,
    table: {
      columns: [spec.x, ...series.map((item) => item.label)],
      rows: limited.map((group) => [
        group.category,
        ...series.map((item) => group.values[item.key] ?? 0),
      ]),
    },
    meta: {
      aggregation,
      inputRows: rows.length,
      groups: groups.size,
      truncated,
    },
  };
}
```

Requirements this code must keep:

- Throw `ChartSpecError` with a user-readable message; never leak a stack trace.
- Null y values are ignored, not counted as zero, when averaging.
- `count` counts rows per group, including rows whose y value is null.
- `.xlsx` dates arrive as ISO strings, so `compareStrings` already orders them correctly.
- `limit` caps what is drawn; `meta.truncated` tells the UI to mention it.

## 7. Chart config + summarizer

`src/features/charts/utils/to-chart-config.ts`:

```ts
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
```

`src/features/charts/server/summarize-chart.ts` — used by the AI tool's `toModelOutput`. Keep it under ~40 words:

```ts
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
```

## 8. Client-side guard

Tool outputs are JSON that round-trips through the database. Validate before rendering.

`src/features/charts/utils/guard.ts`:

```ts
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
```

`z.record(z.string(), ...)` is required in zod v4 (it takes key and value schemas).

## 9. Templates

`src/features/charts/components/chart-block/chart-renderer.tsx`:

```tsx
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
```

Notes:

- Every chart is inside an `h-full w-full` container. `ChartBlock` supplies the fixed height (AGENTS.md requirement).
- `payload.stacked` comes straight from `spec.stacked ?? false`. Stacking is only applied to bars and multi-series areas; line, radar, pie, and radial ignore it.
- `Grid` takes no props. `XAxis`/`YAxis`/`Tooltip`/`Legend` are declarative config that render `null`; keep them as direct children of the root.
- Do not add a `"use client"` chart wrapper inside `features/charts/server/*`.

## 10. Data tab

Create a shared table first — step 07 reuses it for `queryData` results.

`src/features/charts/components/result-table.tsx`:

```tsx
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const formatCell = (value: string | number | null) => {
  if (value === null) return "—";
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? value.toLocaleString()
      : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return value;
};

export function ResultTable(props: {
  columns: string[];
  rows: Array<Array<string | number | null>>;
  className?: string;
}) {
  return (
    <ScrollArea className={cn("h-[300px] w-full rounded-lg border", props.className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {props.columns.map((column) => (
              <TableHead key={column} className="whitespace-nowrap">
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex} className="tabular-nums whitespace-nowrap">
                  {formatCell(cell)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
```

`src/features/charts/components/chart-block/chart-data-table.tsx`:

```tsx
"use client";

import type { ChartPayload } from "@/features/charts/types";

import { ResultTable } from "../result-table";

export function ChartDataTable({ payload }: { payload: ChartPayload }) {
  return <ResultTable columns={payload.table.columns} rows={payload.table.rows} />;
}
```

Check `src/components/ui/scroll-area.tsx` — `ScrollArea` takes `className`. Use it as-is.

## 11. Code tab

The code tab is a **read-only inspection view**, not a second renderer. Generate the same JSX `chart-renderer.tsx` uses (with a 3-row preview and the real config), and keep the two files in sync.

`src/features/charts/utils/spec-to-code.ts`:

```ts
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
```

`src/features/charts/components/chart-block/chart-code.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import type { ChartSpec } from "@/features/charts/schema";
import type { ChartPayload } from "@/features/charts/types";
import { specToCode } from "@/features/charts/utils/spec-to-code";

export function ChartCode({ spec, payload }: { spec: ChartSpec; payload: ChartPayload }) {
  const [copied, setCopied] = useState(false);
  const code = useMemo(() => specToCode(spec, payload), [spec, payload]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1_500);
      toastManager.add({
        title: "Copied to clipboard",
        description: "The chart code is on your clipboard.",
        type: "success",
      });
    } catch {
      toastManager.add({
        title: "Could not copy",
        description: "Your browser blocked clipboard access. Select the code and copy it manually.",
        type: "error",
      });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-[11px]">
          Read-only preview. The Data tab has the same numbers as a table.
        </p>
        <Button size="sm" variant="outline" onClick={() => void copy()} aria-label="Copy chart code">
          {copied ? <CheckIcon /> : <CopyIcon />}
          <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>
      <pre className="bg-muted/40 h-[300px] overflow-auto rounded-lg border p-4 text-xs">
        <code>{code}</code>
      </pre>
    </div>
  );
}
```

If you change a template in `chart-renderer.tsx`, update `specToCode` in the same commit-sized change. Never throw from the copy handler.

## 12. Skeleton

`chart-skeleton.tsx`: a `h-[320px]` container with `animate-pulse` bars — use `Skeleton` and a row of `Skeleton` columns with varied heights. Also export `ChartErrorCard({ title, message }: { title?: string; message: string })`:

- `role="alert"`, destructive-tinted border, `AlertTriangle` icon, title defaulting to "Could not draw this chart", the message, and a muted hint to ask again with a supported column.
- No retry button (the chat can regenerate).

## 13. `ChartBlock`

`components/chart-block/index.tsx`:

```tsx
"use client";

import { useState } from "react";
import { BarChart3Icon, CodeIcon, TableIcon } from "lucide-react";

import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import type { RenderChartOutput } from "@/features/charts/types";

import { ChartCode } from "./chart-code";
import { ChartDataTable } from "./chart-data-table";
import { ChartRenderer } from "./chart-renderer";

export function ChartBlock({ output }: { output: RenderChartOutput }) {
  const [tab, setTab] = useState("chart");
  const { payload, spec } = output;

  return (
    <Tabs value={tab} onValueChange={(next) => setTab(String(next))} className="gap-0">
      <figure className="bg-card flex w-full flex-col overflow-hidden rounded-xl border" aria-label={spec.title}>
        <div className="flex flex-col items-start justify-between gap-2 border-b px-4 py-3 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <figcaption className="truncate text-sm font-medium">{spec.title}</figcaption>
            {spec.subtitle ? (
              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{spec.subtitle}</p>
            ) : null}
            <p className="text-muted-foreground mt-1 text-[11px]">
              {payload.rows.length}{" "}
              {payload.type === "pie" || payload.type === "radial" ? "slices" : "points"}
              {payload.meta.truncated ? ` · top ${payload.rows.length} of ${payload.meta.groups}` : ""}
              {` · ${payload.meta.aggregation}`}
            </p>
          </div>

          <TabsList>
            <TabsTab value="chart" aria-label="Chart">
              <BarChart3Icon />
            </TabsTab>
            <TabsTab value="data" aria-label="Data">
              <TableIcon />
            </TabsTab>
            <TabsTab value="code" aria-label="Code">
              <CodeIcon />
            </TabsTab>
          </TabsList>
        </div>

        <TabsPanel value="chart" className="p-4">
          <div className="h-[320px] w-full">
            <ChartRenderer payload={payload} />
          </div>
        </TabsPanel>
        <TabsPanel value="data" className="p-4">
          <ChartDataTable payload={payload} />
        </TabsPanel>
        <TabsPanel value="code" className="p-4">
          <ChartCode spec={spec} payload={payload} />
        </TabsPanel>
      </figure>
    </Tabs>
  );
}
```

One `Tabs` root, with `TabsList` inside the header and panels below — no duplicated roots, so the state cannot desync. Verify against `src/components/ui/tabs.tsx` before writing; `TabsTab` needs `value`, and `TabsPanel` is the panel.

Mobile: the header stacks on `max-sm`; icons stay in one row. The chart height stays 320px.

## 14. Wire it into the message list

Replace the temporary `ToolPart` body in `src/features/chats/components/message-list/tool-part.tsx`:

```tsx
"use client";

import { ChartBlock } from "@/features/charts";
import { ChartErrorCard, ChartSkeleton } from "@/features/charts";
import { parseRenderChartOutput } from "@/features/charts/utils/guard";

export function ToolPart({ name, part }: { name: string; part: ToolUIPart }) {
  if (name !== "renderChart") {
    // step 07 adds queryData; until then, keep a neutral card.
    return <div className="bg-muted/40 rounded-lg border p-3 text-xs">Using a tool…</div>;
  }

  if (part.state === "input-streaming" || part.state === "input-available") {
    return <ChartSkeleton />;
  }

  if (part.state === "output-error") {
    return <ChartErrorCard message={part.errorText ?? "The chart could not be built."} />;
  }

  if (part.state === "output-available") {
    const output = parseRenderChartOutput(part.output);
    if (!output) {
      return <ChartErrorCard message="This chart was saved in an unknown format. Ask again." />;
    }
    return <ChartBlock output={output} />;
  }

  return null;
}
```

Import `ToolUIPart` from `"ai"`. Export `ChartErrorCard`, `ChartSkeleton`, `ChartBlock`, `parseRenderChartOutput` from `src/features/charts/index.ts`.

## 15. Barrel

`src/features/charts/index.ts`:

```ts
export * from "./components/chart-block";
export * from "./components/chart-block/chart-skeleton";
export * from "./components/result-table";
export * from "./schema";
export type * from "./types";
export * from "./utils/guard";
```

Do not export `server/resolve-chart-spec` or `server/summarize-chart` here. Server code imports them by path.

## Acceptance criteria

- [ ] `resolveChartSpec` works for every type: bar, line, area, pie, radial, radar, composed.
- [ ] Grouping + `sum` / `avg` / `count` / `min` / `max` / `none` produce correct numbers on a 20-row fixture.
- [ ] `limit` truncates, `meta.truncated` is true, and `sort` ordering is respected.
- [ ] Unknown columns and non-numeric y columns throw `ChartSpecError` with the available column names.
- [ ] Pie with all-zero values throws a readable error instead of rendering an empty circle.
- [ ] Pie/radial with `aggregation: "none"` throws instead of rendering nameless sectors.
- [ ] Series keys are CSS-safe (`revenue`, `revenue_2`, `s_2024`) and pie legends show the original labels.
- [ ] `ChartBlock` renders at a fixed 320px height and never collapses inside the chat column.
- [ ] Data tab shows exactly the resolved table; Code tab shows a copyable snippet and copies with a toast.
- [ ] Invalid tool output renders the error card, never a crash or raw JSON.
- [ ] No AI, no route handler, no tRPC procedure added.
- [ ] `bun run lint` and `bun run build` pass.

Sanity-check the renderer by temporarily passing a hard-coded payload to `ChartBlock` in a dev-only page or Storybook-less preview; delete the preview before finishing.

When done, report the resolver output (payload JSON with 5 rows) for a fixture with `Region`, `Revenue`, `Date`.
