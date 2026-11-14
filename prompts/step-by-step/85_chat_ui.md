# 85 — Step 5: Chat UI shell (message list, markdown, composer)

**Read `AGENTS.md` at the repository root first and strictly follow it.**

> Fifth prompt in the `step-by-step/` series. Step 04 is complete: the sidebar shell exists and `/c/<chatId>` is a placeholder. No AI yet.

## What you are building

**AI Chart Agent** — a ChatGPT-style web app for charts. Every new chat starts with an Excel/CSV upload. Responses are markdown plus inline **component code blocks** where charts are visible. The interface is structured like ChatGPT (not styled like it). Use the Vercel AI SDK for all AI work. Use SSE for chats. Minimize tokens aggressively: template-based chart showing, model never sees raw rows or JSX.

## Your task

Build the chat page that looks and behaves like ChatGPT: fixed header with dataset chip, scrollable message thread with markdown, bottom composer (Enter to send / Shift+Enter for newline), smart auto-scroll with "Jump to latest" button, empty state with suggestion chips, clean loading/error boundaries.

1. Add Streamdown CSS to `src/styles/globals.css`.
2. Replace `src/app/(root)/c/[chatId]/page.tsx` with the server page that prefetches the chat and renders `ChatView` inside `HydrateClient` + `ErrorBoundary` + `Suspense`.
3. Create types and helpers: `to-ui-messages.ts`.
4. Create the `ChatComposer` component (controlled, Enter sends, Shift+Enter newline, Stop button while streaming).
5. Create the message list components: `message-list.tsx`, `message-item.tsx`, `user-message.tsx`, `assistant-message.tsx`, `reasoning-part.tsx`, `tool-part.tsx` (temporary placeholder), `jump-to-latest.tsx`.
6. Create `useStickToBottom` hook (smart auto-scroll, pinned state, JumpToLatest button).
7. Create `ChatView` client component with header, message list, composer, and `ChatEmptyState` (suggestion chips derived from the dataset).
8. Apply accessibility rules (`role="log"`, `aria-live`, `aria-label`).

## Token optimization rules (apply everywhere)

- The model never receives full dataset rows — only a capped profile.
- Charts are templates: the model returns a tiny spec (template + column names + aggregation), never chart data or JSX.
- Tool outputs sent back to the model are summaries only (`toModelOutput`), never resolved rows.
- Only the latest user message is sent from the browser; the server rebuilds history.
- SSE is the transport for chats. Use `createUIMessageStreamResponse` + `DefaultChatTransport`. No custom parser.
- **The assistant response is markdown plus inline component code blocks (chart blocks).** The model never emits JSX/ECharts options/row data — it emits a tiny spec that the server resolves into a ready-to-render component. The Code tab inside each chart block shows the exact component code (evilcharts JSX) so the user can see and copy it.

## Acceptance

- `/c/<chatId>` loads a stored chat without a client-side fetch in the page
- Markdown renders (headings, bold, lists, tables, inline code, fenced code) and looks correct in light/dark mode
- A stored assistant message with `tool-*` parts renders the placeholder card, not a crash or raw JSON
- Composer: Enter sends, Shift+Enter adds a line, empty text does nothing, input clears after send
- Auto-scroll sticks to the bottom while new content arrives; scrolling up shows "Jump to latest" and stops auto-scroll
- Empty chat shows suggestion chips; clicking one sends that prompt through the temporary stub
- Long chat scrolls inside the message area only; the header and composer stay fixed
- `bun run lint` and `bun run build` pass