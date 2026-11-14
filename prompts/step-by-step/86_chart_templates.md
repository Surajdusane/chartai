# 86 — Step 6: Chart templates, spec resolver, and ChartBlock

**Read `AGENTS.md` at the repository root first and strictly follow it.**

> Sixth prompt in the `step-by-step/` series. Step 05 is complete: the chat renders stored messages and the composer works with a temporary stub. No AI yet.

## What you are building

**AI Chart Agent** — a ChatGPT-style web app for charts. Every new chat starts with an Excel/CSV upload. Responses are markdown plus inline **component code blocks** where charts are visible. The interface is structured like ChatGPT (not styled like it). Use the Vercel AI SDK for all AI work. Use SSE for chats. Minimize tokens aggressively: template-based chart showing, model never sees raw rows or JSX.

## Your task

Build everything needed to turn a **tiny chart spec** into a rendered evilcharts chart with visible component code:

1. Create the feature layout under `src/features/charts/` (schema, types, utils, server, components).
2. Create the `chartSpecSchema` zod schema — the ONLY thing the model emits for charts (~10 short fields: type, title, subtitle, x, y, optional aggregation/sort/limit/stacked/unit).
3. Create payload types (`ChartPayload`, `ChartSeries`, `RenderChartOutput`).
4. Create series key utilities (`slugifyKey`, `uniqueKey`, `toSeriesKeys`) — CSS-safe keys.
5. Create the palette (`CHART_PALETTE`).
6. Create `resolveChartSpec` server resolver — reads dataset rows, applies aggregation/sort/limit, throws `ChartSpecError` for bad input.
7. Create `toChartConfig` and `summarizeChart` (used by the AI tool's `toModelOutput`).
8. Create the client-side guard (`chartPayloadSchema`, `parseRenderChartOutput`).
9. Create the seven template renderers in `chart-renderer.tsx` using only `src/components/evilcharts`.
10. Create `ResultTable`, `ChartDataTable`, `ChartCode` (generated component code view), `ChartSkeleton`, `ChartErrorCard`.
11. Create `ChartBlock` with Chart / Data / Code tabs, fixed 320px height.
12. Wire it into the message list (`ToolPart` renders `ChartBlock` for `renderChart`).
13. Create the barrel `src/features/charts/index.ts`.

## Token optimization rules (apply everywhere)

- The model never receives full dataset rows — only a capped profile.
- **Charts are templates: the model returns a tiny spec (template + column names + aggregation), never chart data or JSX.** The server resolves rows and aggregation deterministically.
- Tool outputs sent back to the model are summaries only (`toModelOutput`), never resolved rows.
- Only the latest user message is sent from the browser; the server rebuilds history.
- SSE is the transport for chats. Use `createUIMessageStreamResponse` + `DefaultChatTransport`. No custom parser.
- **Component code is generated locally, not transmitted.** `specToCode` builds the equivalent evilcharts JSX from the stored spec + payload. The Code tab shows this component code block to the user (read-only, copyable), but it is never streamed from the server and never sent to the model.

## Acceptance

- `resolveChartSpec` works for every type: bar, line, area, pie, radial, radar, composed
- Grouping + `sum` / `avg` / `count` / `min` / `max` / `none` produce correct numbers on a 20-row fixture
- `limit` truncates, `meta.truncated` is true, and `sort` ordering is respected
- Unknown columns and non-numeric y columns throw `ChartSpecError` with the available column names
- Pie with all-zero values throws a readable error instead of rendering an empty circle
- Pie/radial with `aggregation: "none"` throws instead of rendering nameless sectors
- Series keys are CSS-safe (`revenue`, `revenue_2`, `s_2024`) and pie legends show the original labels
- `ChartBlock` renders at a fixed 320px height and never collapses inside the chat column
- Data tab shows exactly the resolved table; Code tab shows a copyable component code snippet and copies with a toast
- Invalid tool output renders the error card, never a crash or raw JSON
- No AI, no route handler, no tRPC procedure added
- `bun run lint` and `bun run build` pass