# AI Chart Agent — build prompts (run in order)

These prompts are written for an AI coding agent. Give it **one prompt at a time, in order**, and do not move to the next step until the current one passes its acceptance criteria.

## Mandatory first line of every prompt

**Every prompt must start with: "Read `AGENTS.md` at the repository root first and strictly follow it."** This is non-negotiable — the agent must re-read the project rules (tRPC, features folder, `@/` imports, toast, confirm hook, evilcharts, Vercel AI SDK, SSE streaming, token optimization) before doing any work in that step.

## Two prompt styles

- `prompts/01_*.md` … `prompts/09_*.md` — the original 9-step prompts. Each one opens with the mandatory first line.
- `prompts/step-by-step/81_*.md` … `prompts/step-by-step/89_*.md` — the **same 9 steps rewritten as self-contained, single-file instructions**. Each one opens with the mandatory first line and includes the token-optimization rules inline. Use this folder if you want each prompt to be fully self-contained.

## How to use

1. Open the agent session at the repository root.
2. Paste the contents of `01_*.md` only.
3. Let the agent implement and verify.
4. Run the verification commands yourself (`bun run lint`, `bun run build`, plus the step's manual checks).
5. Only then paste `02_*.md`.

Do not commit unless you explicitly want a commit (per `AGENTS.md`).

## Order

| # | Prompt | Builds |
|---|---|---|
| 01 | `01_fix_scaffold_and_schema.md` | Fix broken tRPC scaffold, install deps, Drizzle schema |
| 02 | `02_database_queries_and_trpc.md` | DB queries, tRPC routers, hooks, prefetching |
| 03 | `03_dataset_upload_and_parsing.md` | CSV/XLSX parsing, column profiling, upload + new chat |
| 04 | `04_app_shell_and_sidebar.md` | ChatGPT-style shell, sidebar history, routing |
| 05 | `05_chat_ui_shell.md` | Chat page, message list, markdown, composer |
| 06 | `06_chart_templates_and_resolver.md` | Chart spec, aggregation, evilcharts templates, ChartBlock |
| 07 | `07_ai_sse_streaming.md` | Vercel AI SDK, OpenRouter, SSE streaming, tools, prompts |
| 08 | `08_persistence_and_polish.md` | Save on stream end, titles, invalidation, UX polish |
| 09 | `09_hardening_and_verification.md` | Limits, security, E2E checklist, release |

## Rules that apply to every prompt

- **Read `AGENTS.md` at the repository root first and strictly follow it** in every step.
- Use **tRPC strictly** for app data (queries, mutations, prefetching). The only allowed exception is the LLM streaming route handler in step 07.
- Put feature code under `src/features/<feature>/` with `components`, `hooks`, `schema`, `server`, `utils`, `types`, `index.ts`.
- Use `@/` imports only. No relative `../` imports.
- Use `toastManager` from `@/components/ui/toast` for all success/error messages.
- Use `ConfirmationDialog` + `confirm` from `@/hooks/use-confirm` for destructive actions.
- Use the installed **evilcharts** components from `src/components/evilcharts/charts` for every chart. Do not install other chart libraries and do not render raw ECharts options from model output.
- Use the **Vercel AI SDK** (`ai`, `@ai-sdk/react`) for all AI work. Do not call OpenRouter directly with `fetch`.
- Chat streaming must use **SSE** (Server-Sent Events). The AI SDK's `createUIMessageStreamResponse` already emits `text/event-stream`; use its `DefaultChatTransport` on the client. Do not build a custom polling loop or custom SSE parser.
- Optimize tokens aggressively:
  - The model never receives full dataset rows; only a capped profile.
  - Charts are **templates**: the model returns a tiny spec (template + column names + aggregation), never chart data or JSX.
  - Tool outputs sent back to the model are summaries only (`toModelOutput`), never resolved rows.
  - Only the latest user message is sent from the browser; the server rebuilds history.
- Charts are client components. Always render inside a fixed-height container.
- Do not create branches, worktrees, or commits automatically.

## Final product flow

1. New chat starts with a CSV/XLSX upload.
2. Upload creates one dataset + one chat.
3. User prompts in a normal chat composer.
4. Assistant streams markdown + chart blocks rendered from the installed evilcharts templates.
5. Every chart block has **Chart / Data / Code** tabs; the Code tab shows the equivalent evilcharts JSX.
