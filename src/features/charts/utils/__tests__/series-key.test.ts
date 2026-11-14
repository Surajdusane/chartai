import { describe, expect, test } from "bun:test";

import { slugifyKey, uniqueKey, toSeriesKeys } from "../series-key";

describe("series-key", () => {
  test('"Revenue ($)" → revenue', () => {
    expect(slugifyKey("Revenue ($)")).toBe("revenue");
  });

  test('"2024 Total" → s_2024_total', () => {
    expect(slugifyKey("2024 Total")).toBe("s_2024_total");
  });

  test('"Été" → ete', () => {
    expect(slugifyKey("Été")).toBe("ete");
  });

  test("duplicates get _2, _3", () => {
    const used = new Set<string>();
    expect(uniqueKey("Revenue", used)).toBe("revenue");
    expect(uniqueKey("Revenue", used)).toBe("revenue_2");
    expect(uniqueKey("Revenue", used)).toBe("revenue_3");
  });

  test("toSeriesKeys maps labels to unique keys", () => {
    const map = toSeriesKeys(["Revenue ($)", "Revenue ($)", "2024 Total"]);
    expect(map.get("Revenue ($)")).toBe("revenue_2");
    expect(map.get("2024 Total")).toBe("s_2024_total");
  });
});
