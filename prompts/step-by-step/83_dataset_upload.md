# 83 — Step 3: Dataset upload and CSV/XLSX parsing

**Read `AGENTS.md` at the repository root first and strictly follow it.**

> Third prompt in the `step-by-step/` series. Step 02 is complete: `chats.getMany` / `chats.getById` / `chats.rename` / `chats.remove` work, and the `chats` hooks exist.

## What you are building

**AI Chart Agent** — a ChatGPT-style web app for charts. Every new chat starts with an Excel/CSV upload. Responses are markdown plus inline **component code blocks** where charts are visible. The interface is structured like ChatGPT (not styled like it). Use the Vercel AI SDK for all AI work. Use SSE for chats. Minimize tokens aggressively: template-based chart showing, model never sees raw rows or JSX.

## Your task

A user drops a `.csv` or `.xlsx` file on the new-chat screen. The server parses it, profiles every column, stores the dataset and rows, creates a chat, and returns `{ chatId, datasetId }`. The client redirects to `/c/<chatId>`. No AI and no charts yet.

1. Create limits in `src/features/datasets/utils/limits.ts` (MAX_FILE_BYTES=5MB, MAX_ROWS=20000, MAX_COLUMNS=200, etc.).
2. Create the `createDataset` tRPC input schema in `src/trpc/schema/dataset.ts`.
3. Create `coerce-value.ts` and `profile-columns.ts` server helpers.
4. Create `parse-file.ts` with `parseDatasetFile()` — handles CSV (PapaParse) and XLSX (exceljs), normalizes headers, infers types, profiles columns.
5. Create the `datasets.create` tRPC mutation that parses, stores the dataset, creates a chat, and returns `{ chatId, datasetId }`.
6. Create client utilities (`format-bytes`, `read-file-as-base64`) and the `useCreateDataset` hook.
7. Create the `UploadDropzone` component (clickable, drag-and-drop, accessible, loading state).
8. Create the temporary new chat page (`src/app/(root)/page.tsx`) and placeholder chat page (`/c/[chatId]`).

## Token optimization rules (apply everywhere)

- The model never receives full dataset rows — only a capped profile.
- Charts are templates: the model returns a tiny spec (template + column names + aggregation), never chart data or JSX.
- Tool outputs sent back to the model are summaries only (`toModelOutput`), never resolved rows.
- Only the latest user message is sent from the browser; the server rebuilds history.
- SSE is the transport for chats. Use `createUIMessageStreamResponse` + `DefaultChatTransport`. No custom parser.

## Acceptance

- Uploading a CSV creates one `datasets` row and one `chats` row, then navigates to `/c/<chatId>`
- Uploading an `.xlsx` produces the same result
- A file with `10,000` and `$1,234.50` values yields `number` columns with `10000` and `1234.5`
- An ISO date column yields `date` with `YYYY-MM-DD` values
- Empty cells become `null` and are counted in `nullCount`
- `.xls`, files > 5 MB, > 20,000 rows, and > 200 columns each produce a single clear error toast and **no** partial DB rows
- `bun run lint` and `bun run build` pass
- No chart, AI, or streaming code was added