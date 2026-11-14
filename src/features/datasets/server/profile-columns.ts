import type { ColumnProfile, ColumnType, DatasetRow, DatasetValue } from "@/db/schema";

const round4 = (n: number) => Math.round(n * 10000) / 10000;

const toStringSample = (v: DatasetValue): string => {
  if (v === null) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
};

const isNullish = (v: DatasetValue) => v === null || v === undefined;

export function profileColumns(input: {
  rows: DatasetRow[];
  columns: ColumnProfile[];
}): ColumnProfile[] {
  const { rows, columns } = input;

  return columns.map((col) => {
    const name = col.name;
    const type: ColumnType = col.type;
    const values = rows.map((r) => r[name] as DatasetValue);
    const nonNull = values.filter((v) => !isNullish(v));
    const nullCount = values.length - nonNull.length;

    const uniqueSet = new Set(nonNull.map((v) => toStringSample(v)));
    const uniqueCount = uniqueSet.size;

    const sampleValues: string[] = [];
    for (const v of nonNull) {
      if (sampleValues.length >= 3) break;
      const s = toStringSample(v);
      if (!sampleValues.includes(s)) sampleValues.push(s);
    }

    const profile: ColumnProfile = {
      name,
      type,
      nullCount,
      uniqueCount,
      sampleValues,
    };

    if (col.unit) profile.unit = col.unit;

    if (type === "number") {
      const nums = nonNull.filter((v): v is number => typeof v === "number");
      if (nums.length > 0) {
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        profile.min = min;
        profile.max = max;
        profile.mean = round4(mean);
      }
    } else if (type === "date") {
      const dates = nonNull.filter((v): v is string => typeof v === "string");
      if (dates.length > 0) {
        const sorted = [...dates].sort();
        profile.min = sorted[0];
        profile.max = sorted[sorted.length - 1];
      }
    } else {
      // string or boolean: topValues (max 5, by frequency, then alphabetically)
      const freq = new Map<string, number>();
      for (const v of nonNull) {
        const s = toStringSample(v);
        freq.set(s, (freq.get(s) ?? 0) + 1);
      }
      const topValues = Array.from(freq.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 5)
        .map(([k]) => k);
      profile.topValues = topValues;
    }

    return profile;
  });
}
