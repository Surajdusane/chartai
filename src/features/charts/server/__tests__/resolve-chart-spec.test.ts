import { describe, expect, test } from "bun:test";

import { ChartSpecError, resolveChartSpec } from "../resolve-chart-spec";
import type { ChartSpec } from "@/features/charts/schema";
import type { ColumnProfile } from "@/db/schema";

const columns: ColumnProfile[] = [
  { name: "Region", type: "string", nullCount: 0, uniqueCount: 4, sampleValues: ["North", "South", "East", "West"] },
  { name: "Revenue", type: "number", nullCount: 2, uniqueCount: 10, sampleValues: ["100", "200", "300"] },
  { name: "Date", type: "date", nullCount: 0, uniqueCount: 20, sampleValues: ["2025-01-01", "2025-01-02", "2025-01-03"] },
];

const rows = (() => {
  const regions = ["North", "South", "East", "West"];
  const result: Record<string, string | number | null>[] = [];
  for (let i = 0; i < 20; i += 1) {
    result.push({
      Region: regions[i % 4],
      Revenue: i % 5 === 0 ? null : (i + 1) * 100,
      Date: `2025-0${1 + Math.floor(i / 10)}-${String(i % 10 + 1).padStart(2, "0")}`,
    });
  }
  return result;
})();

const baseSpec: ChartSpec = {
  type: "bar",
  title: "Revenue by Region",
  x: "Region",
  y: ["Revenue"],
};

describe("resolve-chart-spec", () => {
  test("sum groups by Region, sorts value-desc, and respects limit", () => {
    const payload = resolveChartSpec({
      spec: { ...baseSpec, aggregation: "sum", sort: "value-desc", limit: 2 },
      columns,
      rows,
    });
    expect(payload.xKey).toBe("category");
    expect(payload.rows.length).toBe(2);
    expect(payload.meta.truncated).toBe(true);
    expect(payload.meta.groups).toBe(4);
  });

  test("avg ignores nulls", () => {
    const payload = resolveChartSpec({
      spec: { ...baseSpec, aggregation: "avg" },
      columns,
      rows,
    });
    expect(payload.rows.length).toBe(4);
    for (const row of payload.rows) {
      const revenue = row.revenue as number;
      expect(Number.isFinite(revenue)).toBe(true);
    }
  });

  test("count counts all rows in a group, including null revenue", () => {
    const payload = resolveChartSpec({
      spec: { ...baseSpec, aggregation: "count", y: ["Revenue"] },
      columns,
      rows,
    });
    expect(payload.rows.length).toBe(4);
    for (const row of payload.rows) {
      expect(row.revenue).toBe(5);
    }
  });

  test("min / max return the right values", () => {
    const minPayload = resolveChartSpec({
      spec: { ...baseSpec, aggregation: "min" },
      columns,
      rows,
    });
    const maxPayload = resolveChartSpec({
      spec: { ...baseSpec, aggregation: "max" },
      columns,
      rows,
    });
    expect(minPayload.rows.length).toBe(4);
    expect(maxPayload.rows.length).toBe(4);
    const minRow = minPayload.rows[0] as Record<string, number>;
    const maxRow = maxPayload.rows[0] as Record<string, number>;
    expect(minRow.revenue).toBeGreaterThanOrEqual(0);
    expect(maxRow.revenue).toBeGreaterThanOrEqual(minRow.revenue);
  });

  test("aggregation none keeps row order and caps at limit", () => {
    const payload = resolveChartSpec({
      spec: { ...baseSpec, aggregation: "none", limit: 5 },
      columns,
      rows,
    });
    expect(payload.xKey).toBe("category");
    expect(payload.rows.length).toBe(5);
    expect(payload.meta.truncated).toBe(true);
  });

  test("pie returns xKey name, one series per sector, and slug keys", () => {
    const payload = resolveChartSpec({
      spec: { ...baseSpec, type: "pie", aggregation: "sum", limit: 10 },
      columns,
      rows,
    });
    expect(payload.xKey).toBe("name");
    expect(payload.series.length).toBe(4);
    for (const row of payload.rows) {
      expect(typeof row.name).toBe("string");
      expect(typeof row.value).toBe("number");
    }
  });

  test("duplicate category labels produce unique keys (a, a_2)", () => {
    const dupColumns: ColumnProfile[] = [
      { name: "Category", type: "string", nullCount: 0, uniqueCount: 2, sampleValues: ["a", "b"] },
      { name: "Value", type: "number", nullCount: 0, uniqueCount: 2, sampleValues: ["1", "2"] },
    ];
    // "a" and "A" slugify to the same key "a", so the second gets "_2".
    const dupRows = [
      { Category: "a", Value: 1 },
      { Category: "A", Value: 2 },
      { Category: "b", Value: 3 },
    ];
    const payload = resolveChartSpec({
      spec: { type: "pie", title: "Dup", x: "Category", y: ["Value"], aggregation: "sum" },
      columns: dupColumns,
      rows: dupRows,
    });
    const labels = payload.series.map((s) => s.label);
    expect(labels).toContain("a");
    expect(labels).toContain("A");
  });

  test("unknown column throws ChartSpecError and lists available columns", () => {
    expect(() =>
      resolveChartSpec({
        spec: { ...baseSpec, x: "Unknown" },
        columns,
        rows,
      }),
    ).toThrow(ChartSpecError);
    try {
      resolveChartSpec({
        spec: { ...baseSpec, x: "Unknown" },
        columns,
        rows,
      });
    } catch (error) {
      if (error instanceof ChartSpecError) {
        expect(error.message).toContain("Region");
        expect(error.message).toContain("Revenue");
        expect(error.message).toContain("Date");
      }
    }
  });

  test("non-numeric y throws", () => {
    expect(() =>
      resolveChartSpec({
        spec: { ...baseSpec, y: ["Region"] },
        columns,
        rows,
      }),
    ).toThrow(ChartSpecError);
  });

  test("pie with all zeros throws", () => {
    const zeroRows = rows.map((row) => ({ ...row, Revenue: 0 }));
    expect(() =>
      resolveChartSpec({
        spec: { ...baseSpec, type: "pie", aggregation: "sum" },
        columns,
        rows: zeroRows,
      }),
    ).toThrow(ChartSpecError);
  });

  test("pie/radial with aggregation none throws", () => {
    expect(() =>
      resolveChartSpec({
        spec: { ...baseSpec, type: "pie", aggregation: "none" },
        columns,
        rows,
      }),
    ).toThrow(ChartSpecError);
    expect(() =>
      resolveChartSpec({
        spec: { ...baseSpec, type: "radial", aggregation: "none" },
        columns,
        rows,
      }),
    ).toThrow(ChartSpecError);
  });

  test("sort x-asc orders ISO dates correctly", () => {
    const payload = resolveChartSpec({
      spec: { ...baseSpec, type: "line", aggregation: "sum", sort: "x-asc" },
      columns,
      rows,
    });
    const categories = payload.rows.map((row) => row.category as string);
    expect(categories).toEqual([...categories].sort());
  });
});
