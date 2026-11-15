import { z } from "zod";

import type { ColumnProfile, DatasetRow, DatasetValue } from "@/db/schema";

export const queryDataInputSchema = z.object({
  columns: z
    .array(z.string().min(1))
    .min(1)
    .max(12)
    .optional()
    .describe("Columns to return, in order. Defaults to the group key, the metric, or the first columns."),
  filters: z
    .array(
      z.object({
        column: z.string(),
        op: z.enum(["=", "!=", ">", ">=", "<", "<=", "contains"]),
        value: z.union([z.string(), z.number()]),
      }),
    )
    .max(3)
    .optional(),
  groupBy: z.string().optional().describe("Group rows by this column."),
  metric: z
    .object({
      column: z.string(),
      aggregation: z.enum(["sum", "avg", "count", "min", "max"]),
    })
    .optional(),
  sortBy: z.string().optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export type QueryDataInput = z.infer<typeof queryDataInputSchema>;

export type QueryDataOutput = {
  columns: string[];
  rows: Array<Array<string | number | null>>;
  totalRows: number;
  truncated: boolean;
};

export class QueryDataError extends Error {}

const asComparable = (value: DatasetValue): string | number | null => {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

/** Orders numbers numerically and everything else as numeric-aware strings. */
const compareValues = (left: string | number, right: string | number) => {
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), undefined, { numeric: true });
};

const matches = (row: DatasetRow, filter: NonNullable<QueryDataInput["filters"]>[number]) => {
  const raw = row[filter.column];
  if (raw === undefined) throw new QueryDataError(`Unknown filter column "${filter.column}".`);

  if (filter.op === "contains") {
    return String(raw ?? "").toLowerCase().includes(String(filter.value).toLowerCase());
  }

  const left = asComparable(raw);
  const right = asComparable(filter.value as DatasetValue);

  if (left === null || right === null) return false;

  switch (filter.op) {
    case "=":
      return left === right || String(left) === String(right);
    case "!=":
      return !(left === right || String(left) === String(right));
    case ">":
      return compareValues(left, right) > 0;
    case ">=":
      return compareValues(left, right) >= 0;
    case "<":
      return compareValues(left, right) < 0;
    case "<=":
      return compareValues(left, right) <= 0;
  }
};

const aggregate = (
  values: number[],
  aggregation: "sum" | "avg" | "count" | "min" | "max",
  count: number,
) => {
  if (aggregation === "count") return count;
  const numbers = values.filter((value) => Number.isFinite(value));
  if (numbers.length === 0) return 0;
  if (aggregation === "sum") return numbers.reduce((total, value) => total + value, 0);
  if (aggregation === "avg") return numbers.reduce((total, value) => total + value, 0) / numbers.length;
  if (aggregation === "min") return Math.min(...numbers);
  return Math.max(...numbers);
};

export function runQuery(input: {
  query: QueryDataInput;
  columns: ColumnProfile[];
  rows: DatasetRow[];
}): QueryDataOutput {
  const columnByName = new Map(input.columns.map((column) => [column.name, column]));
  const check = (name: string) => {
    if (!columnByName.has(name)) {
      throw new QueryDataError(
        `Unknown column "${name}". Available: ${input.columns.map((column) => column.name).join(", ")}.`,
      );
    }
  };

  for (const name of input.query.columns ?? []) check(name);
  for (const filter of input.query.filters ?? []) check(filter.column);
  if (input.query.groupBy) check(input.query.groupBy);
  if (input.query.metric) check(input.query.metric.column);
  if (input.query.sortBy) check(input.query.sortBy);

  const filtered = input.rows.filter((row) =>
    (input.query.filters ?? []).every((filter) => matches(row, filter)),
  );
  const limit = input.query.limit ?? 20;

  if (input.query.groupBy) {
    const metric = input.query.metric;
    const groups = new Map<string, { key: string; count: number; values: number[] }>();

    for (const row of filtered) {
      const key = String(row[input.query.groupBy] ?? "(blank)");
      const group = groups.get(key) ?? { key, count: 0, values: [] };
      group.count += 1;
      if (metric && metric.aggregation !== "count") {
        const value = Number(row[metric.column]);
        if (Number.isFinite(value)) group.values.push(value);
      }
      groups.set(key, group);
    }

    const series = [...groups.values()].map((group) => ({
      key: group.key,
      value: aggregate(group.values, metric?.aggregation ?? "count", group.count),
    }));

    // `sortBy` is ignored after grouping unless it is the group key; sort by the aggregated value instead.
    series.sort((a, b) =>
      input.query.sortDirection === "asc" ? a.value - b.value : b.value - a.value,
    );

    const truncated = series.length > limit;
    const limited = series.slice(0, limit);

    return {
      columns: [input.query.groupBy, metric ? `${metric.aggregation}(${metric.column})` : "count"],
      rows: limited.map((item) => [item.key, Number(item.value.toFixed(4))]),
      totalRows: filtered.length,
      truncated,
    };
  }

  if (input.query.metric) {
    const values = filtered
      .map((row) => Number(row[input.query.metric!.column]))
      .filter((value) => Number.isFinite(value));
    const value = aggregate(values, input.query.metric.aggregation, filtered.length);

    return {
      columns: [`${input.query.metric.aggregation}(${input.query.metric.column})`],
      rows: [[Number(value.toFixed(4))]],
      totalRows: filtered.length,
      truncated: false,
    };
  }

  const sortBy = input.query.sortBy;
  const sorted = sortBy
    ? [...filtered].sort((a, b) => {
        const left = asComparable(a[sortBy]);
        const right = asComparable(b[sortBy]);
        if (left === null || right === null) return 0;
        const order = compareValues(left, right);
        return input.query.sortDirection === "asc" ? order : -order;
      })
    : filtered;

  const truncated = sorted.length > limit;
  const selected = input.query.columns ?? input.columns.slice(0, 5).map((column) => column.name);

  return {
    columns: selected,
    rows: sorted.slice(0, limit).map((row) =>
      selected.map((name) => {
        const value = row[name];
        if (typeof value === "number" || typeof value === "string" || value === null) return value;
        return value === undefined ? null : String(value);
      }),
    ),
    totalRows: filtered.length,
    truncated,
  };
}
