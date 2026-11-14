# 81 — Step 1: Scaffold, deps, and database schema

**Read `AGENTS.md` at the repository root first and strictly follow it.**

> This is the first prompt in the `step-by-step/` series. It mirrors `prompts/01_fix_scaffold_and_schema.md` but is written as a single, self-contained instruction set. Do not skip ahead.

## What you are building

**AI Chart Agent** — a ChatGPT-style web app for charts. Every new chat starts with an Excel/CSV upload. Responses are markdown plus inline **component code blocks** where charts are visible. The interface is structured like ChatGPT (not styled like it). Use the Vercel AI SDK for all AI work. Use SSE for chats. Minimize tokens aggressively: template-based chart showing, model never sees raw rows or JSX.

## Your task

1. Install dependencies with `bun`:
   - `ai@^7`, `@ai-sdk/react@^4`, `@openrouter/ai-sdk-provider@^3`
   - `papaparse@^5`, `exceljs@^4`, `streamdown@^2`
   - dev: `@types/papaparse`, `drizzle-kit@rc`, `dotenv`
2. Add `db:push` and `db:studio` scripts to `package.json`.
3. Create `.env.example` with `DATABASE_URL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`.
4. Update `next.config.ts` to add `serverExternalPackages: ["exceljs"]` (keep the existing turbopack block).
5. Replace `src/db/schema.ts` with the three tables (`datasets`, `chats`, `messages`) and the `relations` export. Include `ColumnProfile`, `DatasetRow`, `DatasetValue` types.
6. Create `drizzle-kit` config at the repo root.
7. Fix `src/trpc/routers/_app.ts` — it currently imports non-existent routers. Replace with a temporary `healthRouter`.
8. Push the schema to Neon with `bunx drizzle-kit push`.

## Token optimization rules (apply everywhere)

- The model never receives full dataset rows — only a capped profile.
- Charts are templates: the model returns a tiny spec (template + column names + aggregation), never chart data or JSX.
- Tool outputs sent back to the model are summaries only (`toModelOutput`), never resolved rows.
- Only the latest user message is sent from the browser; the server rebuilds history.
- SSE is the transport for chats. Use `createUIMessageStreamResponse` + `DefaultChatTransport`. No custom parser.

## Acceptance

- `bun run lint` passes
- `bun run build` passes (with `DATABASE_URL` unset)
- `bunx drizzle-kit push` created the three tables
- No UI, upload, chart, or AI code was added