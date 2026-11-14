import { describe, expect, test } from "bun:test";

import { profileColumns } from "../profile-columns";
import type { ColumnProfile } from "@/db/schema";

describe("profileColumns", () => {
  test("min/max/mean ignore nulls", () => {
    const columns: ColumnProfile[] = [
      { name: "Score", type: "number", nullCount: 0, uniqueCount: 0, sampleValues: [] },
    ];
    const rows = [
      { Score: 10 },
      { Score: null },
      { Score: 20 },
      { Score: 30 },
    ];
    const [profile] = profileColumns({ rows, columns });
    expect(profile.min).toBe(10);
    expect(profile.max).toBe(30);
    expect(profile.mean).toBe(20);
    expect(profile.nullCount).toBe(1);
  });

  test("topValues is frequency-then-alphabetical", () => {
    const columns: ColumnProfile[] = [
      { name: "Category", type: "string", nullCount: 0, uniqueCount: 0, sampleValues: [] },
    ];
    const rows = [
      { Category: "b" },
      { Category: "a" },
      { Category: "b" },
      { Category: "c" },
      { Category: "a" },
      { Category: "a" },
    ];
    const [profile] = profileColumns({ rows, columns });
    expect(profile.topValues).toEqual(["a", "b", "c"]);
  });

  test("sampleValues caps at 3", () => {
    const columns: ColumnProfile[] = [
      { name: "Name", type: "string", nullCount: 0, uniqueCount: 0, sampleValues: [] },
    ];
    const rows = [
      { Name: "alice" },
      { Name: "bob" },
      { Name: "carol" },
      { Name: "dave" },
    ];
    const [profile] = profileColumns({ rows, columns });
    expect(profile.sampleValues.length).toBeLessThanOrEqual(3);
    expect(profile.sampleValues).toContain("alice");
    expect(profile.sampleValues).toContain("bob");
    expect(profile.sampleValues).toContain("carol");
  });
});
