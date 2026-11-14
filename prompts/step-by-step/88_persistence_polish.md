# 88 — Step 8: Persistence polish, titles, regenerate, and responsive UX

**Read `AGENTS.md` at the repository root first and strictly follow it.**

> Eighth prompt in the `step-by-step/` series. Step 07 is complete: chat streams over SSE, both tools work, and messages persist on stream end.

## What you are building

**AI Chart Agent** — a ChatGPT-style web app for charts. Every new chat starts with an Excel/CSV upload. Responses are markdown plus inline **component code blocks** where charts are visible. The interface is structured like ChatGPT (not styled like it). Use the Vercel AI SDK for all AI work. Use SSE for chats. Minimize tokens aggressively: template-based chart showing, model never sees raw rows or JSX.

## Your task

Make the chat feel finished:

1. Create `src/features/chats/server/generate-title.ts` — `generateChatTitle()` using `generateText` with a 2s timeout race.
2. Wire titles into the stream end in `src/app/api/chat/route.ts` — generate the title after the response finishes using Next's `after()`. Only rename chats that still carry the file-derived name and only on the first answer.
3. Refresh the title in the UI — invalidate immediately and again after a short delay in `useChatSession.onFinish`. Set `document.title`.
4. Create `src/features/chats/components/message-list/message-actions.tsx` — Copy and Regenerate buttons.
5. Create `src/features/chats/components/message-list/thinking-indicator.tsx` — Spinner + label.
6. Create `src/features/chats/components/follow-up-chips.tsx` — data-derived suggestion chips.
7. Update `useStickToBottom` to use a `ResizeObserver` on the inner content element so charts that mount after streaming don't break auto-scroll.
8. Apply responsive polish (header heights, message gaps, composer padding, chart heights, ChartBlock header stacking, ResultTable scroll, FollowUpChips hiding).

## Token optimization rules (apply everywhere)

- The model never receives full dataset rows — only a capped profile.
- Charts are templates: the model returns a tiny spec (template + column names + aggregation), never chart data or JSX.
- Tool outputs sent back to the model are summaries only (`toModelOutput`), never resolved rows.
- Only the latest user message is sent from the browser; the server rebuilds history.
- SSE is the transport for chats. Use `createUIMessageStreamResponse` + `DefaultChatTransport`. No custom parser.
- Component code is generated locally, not transmitted.

## Acceptance

- The first successful exchange renames the chat to a 3-6 word title, visible in the sidebar and header without a hard refresh
- A manually renamed chat is never auto-titled again
- Title generation never delays the stream (it runs in `after()`), and a title failure never errors the chat
- Regenerate replaces the last answer (text + tool parts) instead of appending a duplicate
- Stop leaves the partial answer visible, marks it "Stopped", and it survives a reload
- Copy writes the assistant's text and shows the check for ~1.5s; a denied clipboard shows an error toast
- Follow-up chips send a prompt, are disabled while streaming, and disappear in long threads
- Charts that mount after streaming do not break auto-scroll; scrolling up still disables it
- No horizontal scroll at 390×844; charts, tables, and code blocks stay inside the card
- `bun run lint` and `bun run build` pass