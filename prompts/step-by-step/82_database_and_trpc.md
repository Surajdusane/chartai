# 82 — Step 2: Database queries, tRPC routers, and React Query hooks

**Read `AGENTS.md` at the repository root first and strictly follow it.**

> Second prompt in the `step-by-step/` series. Step 01 is complete: tables exist in Neon, the app builds, and `appRouter` only has a `health` router.

## What you are building

**AI Chart Agent** — a ChatGPT-style web app for charts. Every new chat starts with an Excel/CSV upload. Responses are markdown plus inline **component code blocks** where charts are visible. The interface is structured like ChatGPT (not styled like it). Use the Vercel AI SDK for all AI work. Use SSE for chats. Minimize tokens aggressively: template-based chart showing, model never sees raw rows or JSX.

## Your task

Build the whole data layer for chats and datasets, exposed strictly through tRPC, with one hook per query/mutation and toasts on every mutation. No UI yet.

1. Create tRPC input schemas in `src/trpc/schema/chat.ts` (getChat, renameChat, deleteChat).
2. Create query functions in `src/db/queries/chats.ts` and `src/db/queries/datasets.ts`. Use Drizzle's relational query builder (`db.query.*`) for reads. Never call `db.transaction()` (Neon HTTP driver doesn't support it).
3. Create the `chats` tRPC router (`getMany`, `getById`, `rename`, `remove`). Register it in `_app.ts`.
4. Create client hooks under `src/features/chats/hooks/` — one per query/mutation. Every mutation must invalidate affected queries and show `toastManager` messages.
5. Create types in `src/features/chats/types/index.ts` (`ChatListItem`, `ChatDetail`).
6. Create server prefetch helpers in `src/features/chats/server/prefetch-chats.ts`.

## Token optimization rules (apply everywhere)

- The model never receives full dataset rows — only a capped profile.
- Charts are templates: the model returns a tiny spec (template + column names + aggregation), never chart data or JSX.
- Tool outputs sent back to the model are summaries only (`toModelOutput`), never resolved rows.
- Only the latest user message is sent from the browser; the server rebuilds history.
- SSE is the transport for chats. Use `createUIMessageStreamResponse` + `DefaultChatTransport`. No custom parser.

## Acceptance

- `trpc.chats.getMany`, `trpc.chats.getById`, `trpc.chats.rename`, `trpc.chats.remove` exist and are typed end-to-end
- Reads use `db.query.*`; writes use `insert`/`update`/`delete`; no `db.transaction()` anywhere
- `trpc.chats.getById` never returns `dataset.rows`
- `bun run lint` and `bun run build` pass
- No page or component was built in this step