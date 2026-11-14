# 87 — Step 7: AI streaming over SSE (`/api/chat`, OpenRouter, tools)

**Read `AGENTS.md` at the repository root first and strictly follow it.**

> Seventh prompt in the `step-by-step/` series. Step 06 is complete: the chart schema, resolver, and `ChartBlock` render a hard-coded payload. The chat still uses the temporary `send` stub from step 05.

## What you are building

**AI Chart Agent** — a ChatGPT-style web app for charts. Every new chat starts with an Excel/CSV upload. Responses are markdown plus inline **component code blocks** where charts are visible. The interface is structured like ChatGPT (not styled like it). Use the Vercel AI SDK for all AI work. Use SSE for chats. Minimize tokens aggressively: template-based chart showing, model never sees raw rows or JSX.

## Your task

Replace the stub with real streaming:

1. Create `src/features/assistant/server/model.ts` — `getChatModel()` using `createOpenRouter`.
2. Create `src/features/assistant/server/system-prompt.ts` — `buildSystemPrompt()` with capped column profile, prompt-injection delimiters, and rules.
3. Create `src/features/assistant/server/query-data.ts` — `queryDataInputSchema`, `runQuery()`, `QueryDataError`.
4. Create `src/features/assistant/server/tools.ts` — `createChatTools()` with `renderChart` and `queryData` tools, both with `toModelOutput` for token control.
5. Create `src/app/api/chat/route.ts` — `POST /api/chat` Route Handler using `streamText` + `createUIMessageStreamResponse` + `toUIMessageStream`. Loads chat + dataset from DB, validates the incoming message, rebuilds history, streams, and persists on end.
6. Create `src/features/assistant/hooks/use-chat-session.ts` — `useChat` + `DefaultChatTransport` that sends only the latest message.
7. Retire the temporary stub in `chat-view.tsx`.
8. Update `tool-part.tsx` to render `ChartBlock` for `renderChart` and `DataTableBlock` for `queryData`.
9. Create `src/features/assistant/utils/guard.ts` (`parseQueryDataOutput`) and `data-table-block.tsx`.
10. Create the barrel `src/features/assistant/index.ts`.

## Token optimization rules (apply everywhere)

- The model never receives full dataset rows — only a capped profile.
- Charts are templates: the model returns a tiny spec (template + column names + aggregation), never chart data or JSX.
- Tool outputs sent back to the model are summaries only (`toModelOutput`), never resolved rows.
- **Only the latest user message is sent from the browser; the server rebuilds history.** `prepareSendMessagesRequest` sends `messages.at(-1)` plus `chatId` and `trigger`.
- **SSE is the transport for chats.** Use `createUIMessageStreamResponse` + `DefaultChatTransport`. No custom parser, no polling.
- Component code is generated locally, not transmitted.

## Acceptance

- Sending a message creates a user message immediately, streams text token-by-token, and ends in `ready`
- "Chart revenue by region" produces a `renderChart` tool part that renders a real chart while streaming
- "What were the top 5 rows by revenue?" produces a `queryData` table block
- Reloading `/c/<chatId>` re-renders the same charts and tables from stored tool parts
- The request body contains one message, not the whole history (check DevTools → Network → Payload)
- `POST /api/chat` responds with `content-type: text/event-stream` and the AI SDK stream headers
- `stop()` aborts the stream, keeps the partial text, and persists it
- Regenerating replaces the last assistant message and does not duplicate it in Postgres
- A missing API key returns a 500 with a readable error and produces an error toast, not a crash
- Model calls per turn never exceed 3
- No `fetch("/api/chat")` call exists outside `DefaultChatTransport`
- `bun run lint` and `bun run build` pass