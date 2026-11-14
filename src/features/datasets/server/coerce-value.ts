import type { ColumnType, DatasetValue } from "@/db/schema";

export type Unit = "$" | "€" | "£" | "₹" | "%" | undefined;

const CURRENCY_SYMBOLS = ["$", "€", "£", "₹"] as const;

/**
 * Accepts only unambiguous dates:
 * - ExcelJS already converted Excel dates to `Date`
 * - ISO strings: YYYY-MM-DD or YYYY-MM-DDTHH:mm(:ss)(Z)
 * Anything else stays a string.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?Z?)?$/;

export type CoercedValue = {
  value: DatasetValue;
  unit?: Unit;
};

const NULLISH = new Set(["", "-", "n/a", "na", "null", "undefined"]);

const BOOLEAN_TRUE = new Set(["true", "yes", "y", "1"]);
const BOOLEAN_FALSE = new Set(["false", "no", "n", "0"]);

export function toIsoDate(value: Date | string): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString();
  }
  const trimmed = String(value).trim();
  if (!ISO_DATE.test(trimmed)) return null;
  // Normalize space separator to T for ISO strings, keep date-only as YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const normalized = trimmed.replace(" ", "T");
  const d = new Date(normalized.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}Z`);
  if (Number.isNaN(d.getTime())) return normalized;
  // preserve original if it had time; for date-only handled above
  return normalized;
}

const detectUnit = (text: string): Unit => {
  if (text.includes("%")) return "%";
  for (const sym of CURRENCY_SYMBOLS) {
    if (text.includes(sym)) return sym;
  }
  return undefined;
};

const parseNumberString = (text: string): number | null => {
  let s = text.trim();
  if (NULLISH.has(s.toLowerCase())) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  // remove currency symbols, %, spaces, thousands separators , and _
  s = s.replace(/[$€£₹%\s,_]/g, "");
  if (s === "" || s === "-" || s === "+") return null;
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
};

export function coerceValue(raw: unknown, type: ColumnType): CoercedValue {
  if (raw === null || raw === undefined) return { value: null };

  if (type === "date") {
    if (raw instanceof Date) {
      const iso = toIsoDate(raw);
      return { value: iso };
    }
    const text = String(raw).trim();
    if (NULLISH.has(text.toLowerCase())) return { value: null };
    const iso = toIsoDate(text);
    return { value: iso ?? null };
  }

  if (type === "number") {
    if (typeof raw === "number") {
      return { value: Number.isFinite(raw) ? raw : null };
    }
    const text = String(raw).trim();
    if (NULLISH.has(text.toLowerCase())) return { value: null };
    const unit = detectUnit(text);
    const n = parseNumberString(text);
    return { value: n, unit };
  }

  if (type === "boolean") {
    if (typeof raw === "boolean") return { value: raw };
    const text = String(raw).trim().toLowerCase();
    if (NULLISH.has(text)) return { value: null };
    if (BOOLEAN_TRUE.has(text)) return { value: true };
    if (BOOLEAN_FALSE.has(text)) return { value: false };
    return { value: null };
  }

  // string
  if (typeof raw === "string") {
    const t = raw.trim();
    return { value: t === "" ? null : t };
  }
  if (raw instanceof Date) {
    return { value: raw.toISOString() };
  }
  if (typeof raw === "number" || typeof raw === "boolean") {
    return { value: String(raw) };
  }
  return { value: null };
}

const isIsoDateLike = (v: unknown): boolean => {
  if (v instanceof Date) return !Number.isNaN(v.getTime());
  if (typeof v !== "string") return false;
  const t = v.trim();
  if (t === "" || NULLISH.has(t.toLowerCase())) return false;
  return ISO_DATE.test(t);
};

const isBooleanLike = (v: unknown): boolean => {
  if (typeof v === "boolean") return true;
  if (typeof v !== "string" && typeof v !== "number") return false;
  const t = String(v).trim().toLowerCase();
  if (t === "" || NULLISH.has(t.toLowerCase())) return false;
  return BOOLEAN_TRUE.has(t) || BOOLEAN_FALSE.has(t);
};

const isNumberLike = (v: unknown): boolean => {
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v !== "string") return false;
  const t = v.trim();
  if (t === "" || NULLISH.has(t.toLowerCase())) return false;
  return parseNumberString(t) !== null;
};

/**
 * Best-effort type detection over a sample. Number must be ≥ 90% parseable,
 * date must be 100% ISO/Date, boolean must be 100% true/false/yes/no style.
 * Otherwise the column is a string.
 */
export function inferColumnType(values: unknown[]): ColumnType {
  const nonNullish = values.filter((v) => {
    if (v === null || v === undefined) return false;
    if (typeof v === "string" && NULLISH.has(v.trim().toLowerCase())) return false;
    return true;
  });
  if (nonNullish.length === 0) return "string";

  const allDate = nonNullish.every(isIsoDateLike);
  if (allDate) return "date";

  const numberCount = nonNullish.filter(isNumberLike).length;
  if (numberCount / nonNullish.length >= 0.9) return "number";

  const allBoolean = nonNullish.every(isBooleanLike);
  if (allBoolean) return "boolean";

  return "string";
}
