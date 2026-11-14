# 03 — Dataset upload and CSV/XLSX parsing

**Read `AGENTS.md` at the repository root first and strictly follow it.**

> Step 3 of 9. Step 02 is complete: `chats.getMany` / `chats.getById` / `chats.rename` / `chats.remove` work, and the `chats` hooks exist.

## Goal

A user drops a `.csv` or `.xlsx` file on the new-chat screen. The server parses it, profiles every column, stores the dataset and rows, creates a chat, and returns `{ chatId, datasetId }`. The client redirects to `/c/<chatId>`. No AI and no charts yet.

## Scope rules

- Upload goes through **one tRPC mutation** (`datasets.create`) with a base64 payload. Do not add a second route handler.
- Parsing is 100% server-side (`server-only`).
- Client pages never read files and call the database directly; they call the hook.
- Charts are not part of this step. The chat page can be a placeholder that only proves the redirect works; step 05 builds it.

## Limits

Put these in `src/features/datasets/utils/limits.ts` and use them on **both** client and server:

```ts
export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ROWS = 20_000;
export const MAX_COLUMNS = 200;
export const MAX_PREVIEW_ROWS = 5;
export const SUPPORTED_EXTENSIONS = [".csv", ".xlsx"] as const;

export const isSupportedFilename = (filename: string) =>
  SUPPORTED_EXTENSIONS.some((extension) => filename.toLowerCase().endsWith(extension));
```

`.xls` is not supported. Reject it with a message telling the user to re-save as `.xlsx`.

## Tasks

### 1. Mutation schema

Create `src/trpc/schema/dataset.ts`:

```ts
import { z } from "zod";

export const createDatasetSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(128),
  sizeBytes: z.number().int().positive(),
  /** Raw base64 (no `data:` prefix). */
  data: z.string().min(1),
});

export type CreateDatasetSchema = z.infer<typeof createDatasetSchema>;
```

Add `export * from "./dataset";` to `src/trpc/schema/index.ts`.

### 2. Value coercion

Create `src/features/datasets/server/coerce-value.ts`:

```ts
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

export function coerceValue(raw: unknown, type: ColumnType): CoercedValue { ... }

/**
 * Best-effort type detection over a sample. Number must be ≥ 90% parseable,
 * date must be 100% ISO/Date, boolean must be 100% true/false/yes/no style.
 * Otherwise the column is a string.
 */
export function inferColumnType(values: unknown[]): ColumnType { ... }

export function toIsoDate(value: Date | string): string | null { ... }
```

Implementation requirements:

- Numbers: trim, strip currency symbols, `%`, thousands separators (`,` and `_`), and surrounding spaces. Parentheses mean negative: `(1,234.50)` → `-1234.5`. `1.2e3` is allowed. Empty string / `-` / `n/a` / `null` → `null`.
- Record a single currency unit only when **every** non-null sampled value used the same symbol; `%` is its own unit.
- Dates: return `YYYY-MM-DD` for date-only values and a full ISO string when a time is present. Never use `new Date("01/02/2025")`.
- Booleans: `true/false`, `yes/no`, `y/n`, `1/0` — but only when the whole sample is in that set; never convert a numeric column.
- Strings: preserve casing; trim; do not truncate at parse time (truncate only when building prompts in step 07).
- Never throw for a bad cell; use `null` and count it as a null.

Create `src/features/datasets/server/profile-columns.ts`:

```ts
import type { ColumnProfile, DatasetRow } from "@/db/schema";

export function profileColumns(input: {
  rows: DatasetRow[];
  columns: ColumnProfile[];
}): ColumnProfile[] { ... }
```

For each declared column, fill in `nullCount`, `uniqueCount`, `sampleValues` (max 3), plus:

- `number`: `min`, `max`, `mean` (ignore nulls, round to 4 decimals)
- `date`: `min`, `max` as ISO strings
- `string` / `boolean`: `topValues` (max 5, by frequency, then alphabetically)

### 3. Parse a file

Create `src/features/datasets/server/parse-file.ts` with:

```ts
import "server-only";

import type { DatasetRow, ColumnProfile } from "@/db/schema";

export class DatasetParseError extends Error {}

export type ParsedDataset = {
  name: string;
  mimeType: string;
  sizeBytes: number;
  rowCount: number;
  columns: ColumnProfile[];
  rows: DatasetRow[];
};

export async function parseDatasetFile(input: {
  filename: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<ParsedDataset> { ... }
```

Steps:

1. Validate extension with `isSupportedFilename`. Throw `DatasetParseError("Only .csv and .xlsx files are supported. Re-save .xls files as .xlsx.")`.
2. Validate `buffer.byteLength <= MAX_FILE_BYTES`.
3. **CSV** — decode with `new TextDecoder("utf-8").decode(buffer)`, strip a leading BOM (`\uFEFF`), then:

   ```ts
   Papa.parse<Record<string, string>>(text, {
     header: true,
     skipEmptyLines: "greedy",
     dynamicTyping: false,
     transformHeader: (header) => header, // normalization happens after
   });
   ```

   Do not pass `dynamicTyping: true`; type inference is ours and must be reproducible. If `result.errors` contains a fatal error (`type: "Quotes"` or no data rows), throw `DatasetParseError` with a readable message. Delimiter detection is Papa's default.

4. **XLSX** — `exceljs`:

   ```ts
   const workbook = new ExcelJS.Workbook();
   await workbook.xlsx.load(input.buffer);
   ```

   Pick the first worksheet that has at least one non-empty row. Normalize cell values:
   - `Date` → `toIsoDate`
   - `number` / `boolean` / `string` → as-is
   - objects: use `.result` (formula), then `.text`, then `.richText.map(part => part.text).join("")`, then `.hyperlink`
   - `null`/`undefined` → `null`

5. **Headers** — first non-empty row. `normalizeHeaders`:
   - `String(value ?? "").trim().replace(/\s+/g, " ")`
   - empty → `column_1`, `column_2`, …
   - duplicates (case-insensitive) → append `_2`, `_3`, …
   - cap header length at 80 characters
   - max `MAX_COLUMNS`; if exceeded throw `DatasetParseError("This file has N columns. The limit is 200.")`

6. **Rows** — map every data row to the normalized headers. Skip fully empty rows. If `rows.length > MAX_ROWS`, throw `DatasetParseError("This file has N rows. The limit is 20,000. Filter it and try again.")`. If `rows.length === 0`, throw `DatasetParseError("No data rows found below the header row.")`.

7. **Type inference** — sample the first 1,000 rows per column with `inferColumnType`, then coerce **all** rows with `coerceValue`. Store coerced values (number / boolean / ISO string / string / null).

8. **Profile** — run `profileColumns`.

9. `name` = `input.filename`, `mimeType` = `input.mimeType`, `sizeBytes` = `input.buffer.byteLength`.

Add `src/features/datasets/server/index.ts`:

```ts
export * from "./coerce-value";
export * from "./parse-file";
export * from "./profile-columns";
```

### 4. `datasets.create` mutation

Create `src/trpc/routers/datasets.ts`:

```ts
import { TRPCError } from "@trpc/server";

import { createChat, createDataset, deleteDataset } from "@/db/queries";
import { createTRPCRouter } from "@/trpc/init";
import { authorizedProcedure } from "@/trpc/procedures/authorizedProcedure";
import { createDatasetSchema } from "@/trpc/schema";
import { createDatasetTitle } from "@/features/datasets/utils/create-dataset-title";
import { MAX_FILE_BYTES } from "@/features/datasets/utils/limits";
import { DatasetParseError, parseDatasetFile } from "@/features/datasets/server";

export const datasetsRouter = createTRPCRouter({
  create: authorizedProcedure.input(createDatasetSchema).mutation(async ({ ctx: { db }, input }) => {
    if (input.sizeBytes > MAX_FILE_BYTES) {
      throw new TRPCError({
        code: "PAYLOAD_TOO_LARGE",
        message: "Files must be 5 MB or smaller.",
      });
    }

    const buffer = Buffer.from(input.data, "base64");
    if (buffer.byteLength > MAX_FILE_BYTES) {
      throw new TRPCError({
        code: "PAYLOAD_TOO_LARGE",
        message: "Files must be 5 MB or smaller.",
      });
    }

    let parsed;
    try {
      parsed = await parseDatasetFile({
        filename: input.filename,
        mimeType: input.mimeType,
        buffer,
      });
    } catch (error) {
      if (error instanceof DatasetParseError) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      }
      throw error;
    }

    const dataset = await createDataset(db, parsed);

    try {
      const chat = await createChat(db, {
        id: crypto.randomUUID(),
        title: createDatasetTitle(input.filename),
        datasetId: dataset.id,
      });

      return { chatId: chat.id, datasetId: dataset.id };
    } catch (error) {
      // Keep Neon clean if the chat insert fails after the dataset insert.
      await deleteDataset(db, dataset.id);
      throw error;
    }
  }),
});
```

Add `export * from "./dataset";` to `src/trpc/schema/index.ts` if it is not there yet. Register the router in `src/trpc/routers/_app.ts`:

```ts
export const appRouter = createTRPCRouter({
  health: healthRouter,
  chats: chatsRouter,
  datasets: datasetsRouter,
});
```

Create `src/features/datasets/utils/create-dataset-title.ts`:

```ts
export const createDatasetTitle = (filename: string) => {
  const base = filename.replace(/\.[^.]+$/, "");
  const words = base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const title = words.length > 0 ? words : "New chat";
  return title.charAt(0).toUpperCase() + title.slice(1);
};
```

### 5. Client hooks and utilities

`src/features/datasets/utils/format-bytes.ts`:

```ts
export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
```

`src/features/datasets/utils/read-file-as-base64.ts`:

```ts
"use client";

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });

export const readFileAsBase64 = async (file: File) => {
  const dataUrl = await readAsDataUrl(file);
  const comma = dataUrl.indexOf(",");
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
};
```

`src/features/datasets/hooks/use-create-dataset.ts`:

```ts
"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { useTRPC } from "@/trpc/client";
import { readFileAsBase64 } from "@/features/datasets/utils/read-file-as-base64";
import { MAX_FILE_BYTES, isSupportedFilename } from "@/features/datasets/utils/limits";

export const useCreateDataset = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = trpc.datasets.create.mutationOptions({
    onSuccess: ({ chatId }) => {
      toastManager.add({
        title: "Dataset ready",
        description: "Ask a question or request a chart.",
        type: "success",
      });
      queryClient.invalidateQueries(trpc.chats.getMany.queryOptions());
      router.push(`/c/${chatId}`);
    },
    onError: (error) => {
      toastManager.add({
        title: "Could not read this file",
        description: error.message,
        type: "error",
      });
    },
  });

  const createDataset = useMutation(mutation);

  return {
    ...createDataset,
    uploadFile: async (file: File) => {
      if (!isSupportedFilename(file.name)) {
        toastManager.add({
          title: "Unsupported file",
          description: "Upload a .csv or .xlsx file. Re-save .xls files as .xlsx.",
          type: "error",
        });
        return;
      }

      if (file.size > MAX_FILE_BYTES) {
        toastManager.add({
          title: "File too large",
          description: "Files must be 5 MB or smaller.",
          type: "error",
        });
        return;
      }

      const data = await readFileAsBase64(file);

      createDataset.mutate({
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        data,
      });
    },
  };
};
```

### 6. Upload dropzone

Create `src/features/datasets/components/upload-dropzone/index.tsx` and `file-dropzone.tsx`.

Requirements:

- Clickable/focusable drop area (`role="button"`, `tabIndex={0}`, Enter/Space opens the hidden input).
- Drag events: `dragenter`/`dragover` set an active state, `dragleave`/`drop` clear it. Always call `preventDefault` on `dragover` or the browser navigates to the file.
- Hidden `<input type="file" accept=".csv,.xlsx" />`.
- While the mutation is pending: disable the area, show `<Spinner />`, text "Parsing your dataset…".
- Show `CSV or XLSX · up to 5 MB · max 20,000 rows` as helper text.
- Multiple files dropped → use the first one and toast an info message if there is more than one.
- Styling: Tailwind only, use existing `Card`/`Button`/`Spinner` primitives. Must look correct in light and dark mode (`bg-muted/40`, `border-dashed`, `hover:bg-muted/60`, `focus-visible:ring-2`).

`src/features/datasets/index.ts` exports the hooks, the dropzone, and the utils:

```ts
export * from "./components/upload-dropzone";
export * from "./hooks/use-create-dataset";
export * from "./utils/create-dataset-title";
export * from "./utils/format-bytes";
export * from "./utils/limits";
```

Do not export the server folder from the barrel (it imports `server-only`).

### 7. New chat page (temporary)

`src/app/(root)/page.tsx` must stay a **server component**. Render a centered dropzone through a client component:

```tsx
import { UploadDropzone } from "@/features/datasets";

const page = () => {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
      <div className="flex max-w-xl flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Analyze a spreadsheet with AI</h1>
        <p className="text-muted-foreground text-sm">
          Upload a CSV or Excel file to start a new chat. Every chat keeps its own dataset.
        </p>
      </div>
      <UploadDropzone />
    </main>
  );
};

export default page;
```

Create a minimal placeholder so the redirect target exists: `src/app/(root)/c/[chatId]/page.tsx`:

```tsx
import Link from "next/link";

const page = async ({ params }: PageProps<"/c/[chatId]">) => {
  const { chatId } = await params;

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Chat {chatId}</h1>
      <p className="text-muted-foreground text-sm">The chat UI arrives in step 05.</p>
      <Link className="text-sm underline underline-offset-4" href="/">
        Start another chat
      </Link>
    </main>
  );
};

export default page;
```

`PageProps<"/c/[chatId]">` is the Next 16 generated helper; keep `params` async and await it. Step 04 replaces this placeholder with the sidebar shell, step 05 with the real chat.

## Acceptance criteria

- [ ] Uploading a CSV creates one `datasets` row and one `chats` row, then navigates to `/c/<chatId>`.
- [ ] Uploading an `.xlsx` produces the same result.
- [ ] A file with `10,000` and `$1,234.50` values yields `number` columns with `10000` and `1234.5`.
- [ ] An ISO date column yields `date` with `YYYY-MM-DD` values.
- [ ] Empty cells become `null` and are counted in `nullCount`.
- [ ] `.xls`, files > 5 MB, > 20,000 rows, and > 200 columns each produce a single clear error toast and **no** partial DB rows.
- [ ] `bun run lint` and `bun run build` pass.
- [ ] No chart, AI, or streaming code was added.

Test with a small fixture you create locally (do not commit it): 3 columns (`Region` string, `Revenue` with `$` and commas, `Date` ISO) and ~20 rows.

When done, report the parsed `columns` JSON for that fixture and the created `chatId`.
