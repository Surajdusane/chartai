import { describe, expect, test } from "bun:test";

import { coerceValue, inferColumnType } from "../coerce-value";

describe("coerceValue", () => {
  test('"$1,234.50" → 1234.5 with unit $', () => {
    const result = coerceValue("$1,234.50", "number");
    expect(result.value).toBe(1234.5);
    expect(result.unit).toBe("$");
  });

  test('"(1,200)" → -1200', () => {
    const result = coerceValue("(1,200)", "number");
    expect(result.value).toBe(-1200);
  });

  test('"12%" → 12 with unit %', () => {
    const result = coerceValue("12%", "number");
    expect(result.value).toBe(12);
    expect(result.unit).toBe("%");
  });

  test('"", "n/a" → null for number; string keeps "-"', () => {
    expect(coerceValue("", "number").value).toBeNull();
    expect(coerceValue("n/a", "number").value).toBeNull();
    expect(coerceValue("", "string").value).toBeNull();
    expect(coerceValue("-", "string").value).toBe("-");
  });

  test('"2025-01-02" → date string', () => {
    const result = coerceValue("2025-01-02", "date");
    expect(result.value).toBe("2025-01-02");
  });

  test('"01/02/2025" stays a string', () => {
    const result = coerceValue("01/02/2025", "date");
    expect(result.value).toBeNull();
    const resultStr = coerceValue("01/02/2025", "string");
    expect(resultStr.value).toBe("01/02/2025");
  });
});

describe("inferColumnType", () => {
  test("picks number on numeric samples", () => {
    expect(inferColumnType(["1", "2", "3"])).toBe("number");
  });

  test("picks date on ISO samples", () => {
    expect(inferColumnType(["2025-01-01", "2025-01-02"])).toBe("date");
  });

  test("picks boolean on true/false samples", () => {
    expect(inferColumnType(["true", "false", "true"])).toBe("boolean");
  });

  test("picks string on mixed samples", () => {
    expect(inferColumnType(["hello", "world", "foo"])).toBe("string");
  });

  test("never converts an ambiguous column", () => {
    expect(inferColumnType(["1", "2", "hello"])).toBe("string");
    expect(inferColumnType(["2025-01-01", "not-a-date"])).toBe("string");
    expect(inferColumnType(["true", "maybe"])).toBe("string");
  });
});
