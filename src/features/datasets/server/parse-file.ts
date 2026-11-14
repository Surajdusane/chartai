import "server-only";

import ExcelJS from "exceljs";
import Papa from "papaparse";

import type { ColumnProfile, ColumnType, DatasetRow, DatasetValue } from "@/db/schema";

import { MAX_COLUMNS, MAX_FILE_BYTES, MAX_ROWS, isSupportedFilename } from "@/features/datasets/utils/limits";
import { coerceValue, inferColumnType, toIsoDate, type Unit } from "./coerce-value";
import { profileColumns } from "./profile-columns";

export class DatasetParseError extends Error {}

export type ParsedDataset = {
  name: string;
  mimeType: string;
  sizeBytes: number;
  rowCount: number;
  columns: ColumnProfile[];
  rows: DatasetRow[];
};

const normalizeHeaderCell = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

const normalizeHeaders = (raw: unknown[]): string[] => {
  const headers = raw.map((v) => normalizeHeaderCell(v));
  const seen = new Map<string, number>();
  const out: string[] = [];

  for (let i = 0; i < headers.length; i++) {
    let h = headers[i];
    if (!h) h = `column_${i + 1}`;
    if (h.length > 80) h = h.slice(0, 80);
    const key = h.toLowerCase();
    const count = seen.get(key) ?? 0;
    if (count === 0) {
      out.push(h);
      seen.set(key, 1);
    } else {
      let suffix = count + 1;
      let candidate = `${h}_${suffix}`;
      while (seen.has(candidate.toLowerCase())) {
        suffix += 1;
        candidate = `${h}_${suffix}`;
      }
      out.push(candidate);
      seen.set(key, count + 1);
      seen.set(candidate.toLowerCase(), 1);
    }
  }
  return out;
};

const isRowEmpty = (row: unknown[]): boolean =>
  row.every((v) => {
    if (v === null || v === undefined) return true;
    if (typeof v === "string" && v.trim() === "") return true;
    return false;
  });

const normalizeExcelCell = (value: unknown): unknown => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return toIsoDate(value) ?? value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("result" in obj && obj.result !== undefined && obj.result !== null) {
      return normalizeExcelCell(obj.result);
    }
    if ("text" in obj && typeof obj.text === "string") return obj.text;
    if ("richText" in obj && Array.isArray(obj.richText)) {
      return (obj.richText as Array<{ text?: string }>).map((p) => p.text ?? "").join("");
    }
    if ("hyperlink" in obj && typeof obj.hyperlink === "string") return obj.hyperlink;
    if ("error" in obj) return null;
  }
  return String(value);
};

async function parseCsv(buffer: Buffer): Promise<{ headers: string[]; rawRows: unknown[][] }> {
  const text = new TextDecoder("utf-8").decode(buffer).replace(/^\uFEFF/, "");
  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
  });

  if (result.errors && result.errors.length > 0) {
    const fatal = result.errors.find((e) => e.type === "Quotes" || e.type === "FieldMismatch");
    if (fatal) {
      throw new DatasetParseError(`Could not parse CSV: ${fatal.message}`);
    }
  }

  const data = (result.data as unknown[][]).filter((row) => Array.isArray(row) && !isRowEmpty(row));
  if (data.length === 0) {
    throw new DatasetParseError("No data rows found below the header row.");
  }

  const headerRow = data[0];
  const headers = normalizeHeaders(headerRow);
  const rawRows = data.slice(1).map((row) => {
    const arr = Array.isArray(row) ? row : [];
    return headers.map((_, i) => (i < arr.length ? arr[i] : null));
  });

  return { headers, rawRows };
}

async function parseXlsx(buffer: Buffer): Promise<{ headers: string[]; rawRows: unknown[][] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  let worksheet: ExcelJS.Worksheet | undefined;
  for (const ws of workbook.worksheets) {
    let hasNonEmpty = false;
    ws.eachRow({ includeEmpty: false }, (row) => {
      const values = row.values as unknown[];
      const cells = Array.isArray(values) ? values.slice(1) : [];
      if (!isRowEmpty(cells.map(normalizeExcelCell))) hasNonEmpty = true;
    });
    if (hasNonEmpty) {
      worksheet = ws;
      break;
    }
  }
  if (!worksheet) {
    throw new DatasetParseError("No data rows found below the header row.");
  }

  const allRows: unknown[][] = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values as unknown[];
    const cells = Array.isArray(values) ? values.slice(1) : [];
    allRows.push(cells.map(normalizeExcelCell));
  });

  const filtered = allRows.filter((row) => !isRowEmpty(row));
  if (filtered.length === 0) {
    throw new DatasetParseError("No data rows found below the header row.");
  }

  const headerRow = filtered[0];
  const headers = normalizeHeaders(headerRow);
  const rawRows = filtered.slice(1).map((row) => headers.map((_, i) => (i < row.length ? row[i] : null)));

  return { headers, rawRows };
}

export async function parseDatasetFile(input: {
  filename: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<ParsedDataset> {
  if (!isSupportedFilename(input.filename)) {
    throw new DatasetParseError("Only .csv and .xlsx files are supported. Re-save .xls files as .xlsx.");
  }
  if (input.buffer.byteLength > MAX_FILE_BYTES) {
    throw new DatasetParseError("Files must be 5 MB or smaller.");
  }

  const lower = input.filename.toLowerCase();
  const isCsv = lower.endsWith(".csv");

  let headers: string[];
  let rawRows: unknown[][];

  try {
    if (isCsv) {
      ({ headers, rawRows } = await parseCsv(input.buffer));
    } else {
      ({ headers, rawRows } = await parseXlsx(input.buffer));
    }
  } catch (e) {
    if (e instanceof DatasetParseError) throw e;
    const msg = e instanceof Error ? e.message : "Unknown error";
    throw new DatasetParseError(`Could not parse file: ${msg}`);
  }

  // remove fully empty rows again after mapping to headers
  const dataRows = rawRows.filter((row) => !isRowEmpty(row));

  if (headers.length > MAX_COLUMNS) {
    throw new DatasetParseError(`This file has ${headers.length} columns. The limit is ${MAX_COLUMNS}.`);
  }
  if (dataRows.length === 0) {
    throw new DatasetParseError("No data rows found below the header row.");
  }
  if (dataRows.length > MAX_ROWS) {
    throw new DatasetParseError(
      `This file has ${dataRows.length} rows. The limit is ${MAX_ROWS.toLocaleString()}. Filter it and try again.`,
    );
  }

  // Type inference on sample
  const sampleCount = Math.min(1000, dataRows.length);
  const columnTypes: ColumnType[] = headers.map((_, colIdx) => {
    const sample = [];
    for (let i = 0; i < sampleCount; i++) sample.push(dataRows[i][colIdx]);
    return inferColumnType(sample);
  });

  // Coerce all rows and determine units
  const unitVotes: Array<Map<Unit, number>> = headers.map(() => new Map());
  const coercedRows: DatasetRow[] = dataRows.map((row) => {
    const obj: DatasetRow = {};
    for (let i = 0; i < headers.length; i++) {
      const { value, unit } = coerceValue(row[i], columnTypes[i]);
      obj[headers[i]] = value as DatasetValue;
      if (unit) {
        unitVotes[i].set(unit, (unitVotes[i].get(unit) ?? 0) + 1);
      }
    }
    return obj;
  });

  // Determine single unit per column (only when every non-null sampled value used same symbol)
  const columnUnits: (Unit | undefined)[] = headers.map((_, i) => {
    if (columnTypes[i] !== "number") return undefined;
    const votes = unitVotes[i];
    if (votes.size !== 1) return undefined;
    const [unit, count] = Array.from(votes.entries())[0];
    // must be every non-null sampled value in number-like set had this unit
    // count is how many cells produced a unit; compare to non-null coerced values that came from unit-bearing parse
    const nonNullCount = coercedRows.reduce((acc, r) => {
      const v = r[headers[i]];
      return acc + (v !== null && v !== undefined ? 1 : 0);
    }, 0);
    if (nonNullCount === 0) return undefined;
    if (count === nonNullCount) return unit;
    return undefined;
  });

  const baseColumns: ColumnProfile[] = headers.map((name, i) => {
    const col: ColumnProfile = {
      name,
      type: columnTypes[i],
      nullCount: 0,
      uniqueCount: 0,
      sampleValues: [],
    };
    if (columnUnits[i]) col.unit = columnUnits[i];
    return col;
  });

  const columns = profileColumns({ rows: coercedRows, columns: baseColumns });

  return {
    name: input.filename,
    mimeType: input.mimeType,
    sizeBytes: input.buffer.byteLength,
    rowCount: coercedRows.length,
    columns,
    rows: coercedRows,
  };
}
