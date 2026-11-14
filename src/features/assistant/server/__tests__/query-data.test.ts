import { describe, expect, test } from "bun:test";

import { QueryDataError, runQuery } from "../query-data";
import type { ColumnProfile } from "@/db/schema";

const columns: ColumnProfile[] = [
  { name: "Region", type: "string", nullCount: 0, uniqueCount: 4, sampleValues: ["North", "South", "East", "West"] },
  { name: "Revenue", type: "number", nullCount: 1, uniqueCount: 6, sampleValues: ["100", "200", "300"] },
  { name: "Date", type: "date", nullCount: 0, uniqueCount: 6, sampleValues: ["2025-01-01", "2025-01-02", "2025-01-03"] },
];

const rows = [
  { Region: "North", Revenue: 100, Date: "2025-01-01" },
  { Region: "North", Revenue: 200, Date: "2025-01-02" },
  { Region: "South", Revenue: null, Date: "2025-01-01" },
  { Region: "South", Revenue: 300, Date: "2025-01-03" },
  { Region: "East", Revenue: 150, Date: "2025-01-02" },
  { Region: "West", Revenue: 400, Date: "2025-01-03" },
];

const run = (input: Parameters<typeof runQuery>[0]["query"]) =>
  runQuery({ query: input, columns, rows });

describe("query-data", () => {
  test("equality filter", () => {
    const output = run({ filters: [{ column: "Region", op: "=", value: "North" }] });
    expect(output.rows.length).toBe(2);
    expect(output.totalRows).toBe(2);
  });

  test("contains filter", () => {
    const output = run({ filters: [{ column: "Region", op: "contains", value: "th" }] });
    expect(output.rows.length).toBe(4);
    expect(output.totalRows).toBe(4);
  });

  test("numeric comparison returns false for nulls", () => {
    const output = run({ filters: [{ column: "Revenue", op: ">", value: 50 }] });
    expect(output.rows.length).toBe(5);
  });

  test("groupBy + sum aggregates correctly", () => {
    const output = run({ groupBy: "Region", metric: { column: "Revenue", aggregation: "sum" } });
    expect(output.rows.length).toBe(4);
    const north = output.rows.find((row) => row[0] === "North");
    expect(north?.[1]).toBe(300);
  });

  test("groupBy count counts all rows including null revenue", () => {
    const output = run({ groupBy: "Region", metric: { column: "Revenue", aggregation: "count" } });
    const south = output.rows.find((row) => row[0] === "South");
    expect(south?.[1]).toBe(2);
  });

  test("metric without groupBy returns one row", () => {
    const output = run({ metric: { column: "Revenue", aggregation: "sum" } });
    expect(output.rows.length).toBe(1);
    expect(output.rows[0][0]).toBe(1150);
  });

  test("unknown column throws QueryDataError", () => {
    expect(() => run({ columns: ["Unknown"] })).toThrow(QueryDataError);
    expect(() => run({ filters: [{ column: "Unknown", op: "=", value: "x" }] })).toThrow(
      QueryDataError,
    );
    try {
      run({ groupBy: "Unknown" });
    } catch (error) {
      if (error instanceof QueryDataError) {
        expect(error.message).toContain("Region");
        expect(error.message).toContain("Revenue");
        expect(error.message).toContain("Date");
      }
    }
  });

  test("limit truncates and sets truncated", () => {
    const output = run({ limit: 2 });
    expect(output.rows.length).toBe(2);
    expect(output.truncated).toBe(true);
    expect(output.totalRows).toBe(6);
  });

  test("sortDirection flips the order", () => {
    const asc = run({ sortBy: "Revenue", sortDirection: "asc" });
    const desc = run({ sortBy: "Revenue", sortDirection: "desc" });
    const ascValues = asc.rows.map((row) => row[1] as number).filter((v): v is number => v !== null);
    const descValues = desc.rows.map((row) => row[1] as number).filter((v): v is number => v !== null);
    expect(ascValues[0]).toBeLessThanOrEqual(ascValues[ascValues.length - 1]);
    expect(descValues[0]).toBeGreaterThanOrEqual(descValues[descValues.length - 1]);
  });
});
