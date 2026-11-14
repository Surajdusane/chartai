# Step-by-step build prompts for AI Chart Agent

This folder contains the **same 9 steps** as `prompts/01_*.md` through `prompts/09_*.md`, but rewritten as **self-contained, single-file instructions**. Each file starts with the mandatory first line:

> **Read `AGENTS.md` at the repository root first and strictly follow it.**

…so the agent re-reads the project rules (tRPC, features folder, `@/` imports, toast, confirm hook, evilcharts, Vercel AI SDK, SSE streaming, token optimization) before doing any work in that step.

## How to use

1. Open the agent session at the repository root.
2. Paste the contents of `81_scaffold_and_schema.md` only.
3. Let the agent implement and verify.
4. Run the verification commands yourself (`bun run lint`, `bun run build`, plus the step's manual checks).
5. Only then paste `82_database_and_trpc.md`, and so on through `89_hardening_verification.md`.

Do not commit unless you explicitly want a commit (per `AGENTS.md`).

## Order

| # | File | Builds |
|---|------|--------|
| 81 | `81_scaffold_and_schema.md` | Fix broken tRPC scaffold, install deps, Drizzle schema |
| 82 | `82_database_and_trpc.md` | DB queries, tRPC routers, hooks, prefetching |
| 83 | `83_dataset_upload.md` | CSV/XLSX parsing, column profiling, upload + new chat |
| 84 | `84_app_shell.md` | ChatGPT-style shell, sidebar history, routing |
| 85 | `85_chat_ui.md` | Chat page, message list, markdown, composer |
| 86 | `86_chart_templates.md` | Chart spec, aggregation, evilcharts templates, ChartBlock |
| 87 | `87_ai_sse.md` | Vercel AI SDK, OpenRouter, SSE streaming, tools, prompts |
| 88 | `88_persistence_polish.md` | Save on stream end, titles, invalidation, UX polish |
| 89 | `89_hardening_verification.md` | Limits, security, E2E checklist, release |

## Rules that apply to every prompt

- **Read `AGENTS.md` at the repository root first and strictly follow it** in every step.
- Use **tRPC strictly** for app data (queries, mutations, prefetching). The only allowed exception is the LLM streaming route handler in step 87.
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
  - **Component code is generated locally, not transmitted.** The Code tab inside each chart block generates the equivalent evilcharts JSX from the stored spec + payload (via `specToCode`). The user can see and copy the component code, but it is never streamed from the server and never sent to the model.
- Charts are client components. Always render inside a fixed-height container.
- Do not create branches, worktrees, or commits automatically.

## Final product flow

1. New chat starts with a CSV/XLSX upload.
2. Upload creates one dataset + one chat.
3. User prompts in a normal chat composer.
4. Assistant streams markdown + chart blocks rendered from the installed evilcharts templates.
5. Each chart block has **Chart / Data / Code** tabs; the Code tab shows the equivalent evilcharts JSX as a **visible component code block** in the response.