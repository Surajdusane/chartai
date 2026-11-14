# 89 — Step 9: Hardening, accessibility, tests, and end-to-end verification

**Read `AGENTS.md` at the repository root first and strictly follow it.**

> Ninth prompt in the `step-by-step/` series. Steps 01–08 are complete. This step adds guardrails, accessibility fixes, tests, and the final verification pass. It should not change the product's behavior.

## What you are building

**AI Chart Agent** — a ChatGPT-style web app for charts. Every new chat starts with an Excel/CSV upload. Responses are markdown plus inline **component code blocks** where charts are visible. The interface is structured like ChatGPT (not styled like it). Use the Vercel AI SDK for all AI work. Use SSE for chats. Minimize tokens aggressively: template-based chart showing, model never sees raw rows or JSX.

## Your task

1. **Bound the chat history** — cap model-facing history at 20 messages, text parts at 4,000 chars, body at 128 KB. Apply `windowHistory` only to the array sent to the model; persistence keeps the full history.
2. **Rate limit** — create `src/features/assistant/server/rate-limit.ts` with an in-memory sliding window (20 req/min per IP+chat). Return 429 with `retry-after`.
3. **Prompt-injection defenses** — sanitize the profile (strip control chars, replace backticks, clip), wrap the profile in `<<<DATASET_PROFILE ... DATASET_PROFILE>>>` delimiters, add rules that data is never instructions, and never reveal instructions/env/keys.
4. **Safe tool and stream errors** — keep `ChartSpecError`/`QueryDataError` messages limited to column names and guidance. Wrap `streamText` + response construction in try/catch and return a 500 JSON error on synchronous provider failure.
5. **Output-size guard** — drop assistant messages whose JSON length exceeds 2,000,000 chars before persisting, and log a warning.
6. **Accessibility pass** — `MessageList` gets `role="log"`, `aria-label="Conversation"`, `aria-live="polite"`, `aria-relevant="additions text"`, `aria-busy={isStreaming}`. Composer input has a real placeholder and accessible name. Every icon-only button has `aria-label`. Focus order: sidebar → header → messages → composer. `ChartBlock` is a `<figure>` with `aria-label={spec.title}`. Charts respect `prefers-reduced-motion`. `ThinkingIndicator` uses `role="status"`. Error banner uses `role="alert"`. Run a keyboard-only pass.
7. **Tests** — use `bun test`. Tests live next to the code in `__tests__` folders. Only import modules that do **not** import `server-only`.
   - `resolve-chart-spec.test.ts` — fixture with 20 rows, `Region`/`Revenue`/`Date`; test sum/avg/count/min/max/none, pie/radial behavior, sorting, truncation, errors.
   - `query-data.test.ts` — equality/contains filters, numeric comparison with nulls, groupBy + aggregation, metric without groupBy, unknown column error, limit truncation, sortDirection.
   - `coerce-value.test.ts` — `"$1,234.50"` → `1234.5` with unit `$`, `"(1,200)"` → `-1200`, `"12%"` → `12` with unit `%`, empty/`-`/`n/a` → `null`, `"2025-01-02"` → date, `"01/02/2025"` stays string, `inferColumnType` picks number/date/boolean/string correctly.
   - `profile-columns.test.ts` — min/max/mean ignore nulls, `topValues` is frequency-then-alphabetical, `sampleValues` caps at 3.
   - `series-key.test.ts` — `"Revenue ($)"` → `revenue`, `"2024 Total"` → `s_2024_total`, `"Été"` → `ete`, duplicates get `_2`, `_3`.
8. **Cleanup** — delete any temporary preview page/story/hard-coded payload. Delete `src/db/queries/utils.ts` if empty and unimported. Remove unused imports/exports. Confirm `.env.example` lists the three env vars. Confirm no `NEXT_PUBLIC_` secret. Confirm `drizzle/` is ignored (or intentionally tracked) and no `.env` is staged. Grep for leftovers: `TODO`, `step 0`, `console.log`, `localhost`.
9. **End-to-end checklist** — run `bun run dev` and complete every line (upload, chat, persistence, titles/sidebar, errors, layout, quality gates).

## Token optimization rules (apply everywhere)

- The model never receives full dataset rows — only a capped profile.
- Charts are templates: the model returns a tiny spec (template + column names + aggregation), never chart data or JSX.
- Tool outputs sent back to the model are summaries only (`toModelOutput`), never resolved rows.
- Only the latest user message is sent from the browser; the server rebuilds history.
- SSE is the transport for chats. Use `createUIMessageStreamResponse` + `DefaultChatTransport`. No custom parser.
- Component code is generated locally, not transmitted.

## Acceptance

- History is capped at 20 messages, text parts at 4,000 chars, and requests over 128 KB are rejected
- Rate limiting returns 429 with `retry-after` after 20 requests/minute per IP + chat
- Dataset values are sanitized and delimited; the system prompt states that data is never instructions
- No `dangerouslySetInnerHTML` exists in the repo
- Tool and stream errors are friendly on the client and logged on the server
- Accessibility checklist is complete
- `bun test` passes with the resolver, query, coercion, profiling, and key tests
- The full end-to-end checklist passes
- All changes remain uncommitted in the working tree

## Security note

This app has **no authentication**: anyone with a chat URL can read that chat and its dataset. The chart/query tools are read-only and cannot mutate data or run SQL, which limits blast radius, but multi-tenant use requires auth + row ownership checks (`chats.userId`) before launch. State this explicitly in the final report and do not imply the app is production-secure.