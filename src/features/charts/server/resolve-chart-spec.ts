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
  heatmap: 12,
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
