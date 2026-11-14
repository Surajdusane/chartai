# 84 — Step 4: App shell and sidebar

**Read `AGENTS.md` at the repository root first and strictly follow it.**

> Fourth prompt in the `step-by-step/` series. Step 03 is complete: upload works and redirects to `/c/<chatId>`. The chat page is still a placeholder.

## What you are building

**AI Chart Agent** — a ChatGPT-style web app for charts. Every new chat starts with an Excel/CSV upload. Responses are markdown plus inline **component code blocks** where charts are visible. The interface is structured like ChatGPT (not styled like it). Use the Vercel AI SDK for all AI work. Use SSE for chats. Minimize tokens aggressively: template-based chart showing, model never sees raw rows or JSX.

## Your task

Build a persistent ChatGPT-style shell: collapsible sidebar on the left with chat history grouped by date, `New chat` action, per-chat rename/delete, theme toggle, and a content area that fills the viewport without double scrollbars. Mobile uses the existing sidebar sheet.

1. Create `group-chats-by-date.ts` utility (Today / Yesterday / Previous 7 days / Older).
2. Replace `src/app/(root)/layout.tsx` body with the sidebar shell (`SidebarProvider`, `SidebarInset`, `HydrateClient`, `Providers`, `prefetchChats`).
3. Create sidebar components: `app-sidebar.tsx`, `chat-list.tsx`, `chat-item.tsx`, `rename-chat-dialog.tsx`, `theme-toggle.tsx`.
4. Add `SidebarTrigger` to the top-left of both pages.
5. Apply scroll and sizing rules (fixed-height shell, only the message list scrolls).

## Token optimization rules (apply everywhere)

- The model never receives full dataset rows — only a capped profile.
- Charts are templates: the model returns a tiny spec (template + column names + aggregation), never chart data or JSX.
- Tool outputs sent back to the model are summaries only (`toModelOutput`), never resolved rows.
- Only the latest user message is sent from the browser; the server rebuilds history.
- SSE is the transport for chats. Use `createUIMessageStreamResponse` + `DefaultChatTransport`. No custom parser.

## Acceptance

- Sidebar lists chats grouped Today / Yesterday / Previous 7 days / Older, newest first
- Clicking a chat navigates to `/c/<chatId>` and highlights it in the sidebar
- `New chat` goes to `/` where the upload dropzone is
- Rename works from the chat menu, updates the sidebar and the chat page header after invalidation, and shows toasts
- Delete asks for confirmation, removes the chat, and navigates to `/` when the active chat was deleted
- Sidebar collapses to icons on desktop and becomes a sheet under `md`
- Theme toggle switches light/dark/system without a hydration warning
- No double scrollbar at 1440×900, 1024×768, or 390×844
- `bun run lint` and `bun run build` pass