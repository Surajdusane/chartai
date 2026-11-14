import type { BarVariant } from "@/components/evilcharts/charts/echarts-bar-chart";
import type {
  AreaVariant,
  CurveType,
  DotVariant,
  StrokeVariant,
} from "@/components/evilcharts/charts/echarts-area-chart";
import type { RadialVariant } from "@/components/evilcharts/charts/echarts-radial-chart";
import type { ChartPayload } from "@/features/charts/types";

// Deterministic string hash so the same data shape always picks the same
// variant, while different data shapes vary the look.
function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash = hash & hash; // force 32-bit int
  }
  return Math.abs(hash);
}

function pick<T>(options: readonly T[], seed: string): T {
  return options[hashCode(seed) % options.length];
}

type DataShape = {
  seriesCount: number;
  pointCount: number;
  hasMultipleValues: boolean;
  isMonotonicIncreasing: boolean;
  isMonotonicDecreasing: boolean;
  valueRange: { min: number; max: number };
  total: number;
  manyCategories: boolean; // > 8 categories
  fewCategories: boolean; // <= 6 categories
};

function analyzeData(payload: ChartPayload): DataShape {
  const numericRows = payload.rows.map((row) =>
    payload.series.reduce((sum, s) => sum + (Number(row[s.key]) || 0), 0),
  );
  const values = numericRows.filter((v) => Number.isFinite(v));
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const total = values.reduce((sum, v) => sum + v, 0);

  let increasing = true;
  let decreasing = true;
  for (let i = 1; i < numericRows.length; i++) {
    if (numericRows[i] < numericRows[i - 1]) increasing = false;
    if (numericRows[i] > numericRows[i - 1]) decreasing = false;
  }

  return {
    seriesCount: payload.series.length,
    pointCount: payload.rows.length,
    hasMultipleValues: values.length > 1,
    isMonotonicIncreasing: increasing && numericRows.length > 1,
    isMonotonicDecreasing: decreasing && numericRows.length > 1,
    valueRange: { min, max },
    total,
    manyCategories: payload.rows.length > 8,
    fewCategories: payload.rows.length <= 6,
  };
}

const seedFor = (payload: ChartPayload, suffix = "") =>
  `${payload.type}:${payload.series.map((s) => s.key).join(",")}:${payload.rows.length}:${suffix}`;

/** Bar chart variant selection — mirrors grid/peak/monospace blocks. */
export function selectBarVariants(payload: ChartPayload) {
  const data = analyzeData(payload);
  const seed = seedFor(payload, "bar");
  const stacked = payload.stacked && data.seriesCount > 1;

  const variant: BarVariant = stacked
    ? "default"
    : data.fewCategories
      ? pick(["gradient", "blocks", "expandable"], seed)
      : data.manyCategories
        ? pick(["default", "gradient"], seed)
        : pick(["gradient", "blocks", "default"], seed);

  return {
    variant,
    stackType: stacked ? "stacked" : "default",
    barRadius: data.fewCategories ? 6 : 4,
    barCategoryGap: stacked ? undefined : 14,
    enableHoverHighlight: data.seriesCount > 1,
    glowing: data.seriesCount === 1 && data.fewCategories,
  };
}

/** Line chart variant selection — mirrors payouts/shipments blocks. */
export function selectLineVariants(payload: ChartPayload) {
  const data = analyzeData(payload);
  const seed = seedFor(payload, "line");

  const curveType: CurveType = data.isMonotonicIncreasing || data.isMonotonicDecreasing
    ? "smooth"
    : data.manyCategories
      ? pick(["smooth", "monotone", "linear"], seed)
      : pick(["linear", "smooth", "step"], seed);

  const strokeVariant: StrokeVariant = data.seriesCount > 1 ? "solid" : pick(["solid", "dashed"], seed);

  return {
    curveType,
    strokeVariant,
    strokeWidth: 2,
    glowing: true,
    enableHoverHighlight: data.seriesCount > 1,
    activeDotVariant: pick(["ping", "default"] as DotVariant[], seed),
  };
}

/** Area chart variant selection — mirrors audience/benchmark/latency/portfolio blocks. */
export function selectAreaVariants(payload: ChartPayload) {
  const data = analyzeData(payload);
  const seed = seedFor(payload, "area");
  const stacked = payload.stacked && data.seriesCount > 1;

  const variant: AreaVariant = stacked
    ? "gradient"
    : data.fewCategories
      ? pick(["dotted", "gradient", "solid"], seed)
      : data.isMonotonicIncreasing || data.isMonotonicDecreasing
        ? pick(["gradient", "lines", "gradient-reverse"], seed)
        : pick(["gradient", "dotted", "lines", "solid"], seed);

  const curveType: CurveType = data.fewCategories ? pick(["step", "smooth", "monotone"], seed) : "smooth";

  return {
    variant,
    stackType: stacked ? "stacked" : "default",
    curveType,
    strokeVariant: pick(["solid", "dashed"] as StrokeVariant[], seed),
    strokeWidth: 2.5,
    glowing: true,
    enableHoverHighlight: data.seriesCount > 1,
    enableHoverReveal: data.fewCategories && !stacked,
    activeDotVariant: pick(["ping", "default"] as DotVariant[], seed),
  };
}

/** Pie chart variant selection — mirrors revenue-mix/market-share/progress-rings blocks. */
export function selectPieVariants(payload: ChartPayload) {
  const data = analyzeData(payload);
  const seed = seedFor(payload, "pie");

  const innerRadius = data.fewCategories ? pick(["52%", "62%"], seed) : "0";
  const outerRadius = innerRadius === "0" ? "94%" : "92%";

  return {
    innerRadius,
    outerRadius,
    paddingAngle: data.fewCategories ? pick([2, 3, 6], seed) : 2,
    cornerRadius: innerRadius === "0" ? 0 : pick([0, 12], seed),
    startAngle: 90,
    endAngle: -270,
    isClickable: data.seriesCount > 1,
    labelPosition: "inside" as const,
  };
}

/** Radial chart variant selection — mirrors budget/ride/cache-tiers blocks. */
export function selectRadialVariants(payload: ChartPayload) {
  const data = analyzeData(payload);
  const seed = seedFor(payload, "radial");

  const variant: RadialVariant = data.fewCategories ? pick(["full", "semi"], seed) : "full";
  const innerRadius = variant === "semi" ? "38%" : pick(["35%", "66%", "70%"], seed);
  const outerRadius = variant === "semi" ? "96%" : "95%";

  return {
    variant,
    innerRadius,
    outerRadius,
    barSize: data.fewCategories ? pick([8, 12, 13], seed) : 12,
    cornerRadius: pick([6, 7], seed),
    showBackground: variant === "full" && data.fewCategories,
    max: 100,
  };
}

/** Radar chart variant selection. */
export function selectRadarVariants(payload: ChartPayload) {
  const seed = seedFor(payload, "radar");
  return {
    variant: pick(["filled", "lines"] as const, seed),
    fillOpacity: pick([0.25, 0.15], seed),
  };
}

/** Composed chart variant selection — bar + line mix. */
export function selectComposedVariants(payload: ChartPayload) {
  const seed = seedFor(payload, "composed");
  return {
    barVariant: pick(["gradient", "default"] as const, seed),
    barRadius: 4,
    lineStrokeVariant: pick(["solid", "dashed"] as StrokeVariant[], seed),
    lineCurveType: "smooth" as CurveType,
    lineStrokeWidth: 2,
  };
}

/** Heatmap variant selection — mirrors sales/workouts/contributions blocks. */
export function selectHeatmapVariants(payload: ChartPayload) {
  const data = analyzeData(payload);
  const seed = seedFor(payload, "heatmap");

  return {
    thresholds: data.valueRange.max > 100 ? pick([[40, 75, 150], [30, 60, 100]], seed) : undefined,
    scale: pick(["quantile", "linear"] as const, seed),
    cellRadius: 2,
    cellGap: pick([2, 3], seed),
    weekStart: pick(["monday", "sunday"] as const, seed),
    isClickable: data.pointCount <= 365,
  };
}

export type BarVariants = ReturnType<typeof selectBarVariants>;
export type LineVariants = ReturnType<typeof selectLineVariants>;
export type AreaVariants = ReturnType<typeof selectAreaVariants>;
export type PieVariants = ReturnType<typeof selectPieVariants>;
export type RadialVariants = ReturnType<typeof selectRadialVariants>;
export type RadarVariants = ReturnType<typeof selectRadarVariants>;
export type ComposedVariants = ReturnType<typeof selectComposedVariants>;
export type HeatmapVariants = ReturnType<typeof selectHeatmapVariants>;
