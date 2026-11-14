# 05 — Chat UI shell (message list, markdown, composer)

**Read `AGENTS.md` at the repository root first and strictly follow it.**

> Step 5 of 9. Step 04 is complete: the sidebar shell exists and `/c/<chatId>` is a placeholder. No AI yet — this step renders stored messages, builds the message list, and wires the composer to local state. Step 07 replaces the local stub with `useChat` + `/api/chat`.

## Goal

The chat page looks and behaves like ChatGPT:

- fixed header with dataset chip,
- scrollable message thread with markdown,
- bottom composer with Enter to send / Shift+Enter for a newline,
- smart auto-scroll with a "Jump to latest" button,
- empty state with suggestion chips,
- clean loading/error boundaries.

**Token optimization:** The assistant response is markdown plus inline **component code blocks** (chart blocks). The model never emits JSX/ECharts options/row data — it emits a tiny spec that the server resolves into a ready-to-render component. The Code tab inside each chart block shows the exact component code (evilcharts JSX) so the user can see and copy it.

## Token optimization (chat UI)

The chat UI is built to keep token costs low on both server and client:

1. **Only the latest message is sent from the browser.** The page prefetches the chat via tRPC; the client hook (`useChatSession`) sends only `messages.at(-1)` plus `chatId` and `trigger`. The server rebuilds history from Postgres.
2. **Markdown is streamed, not bulk-loaded.** `streamdown` renders incremental markdown as SSE tokens arrive. No `react-markdown`, no full-document re-render.
3. **Charts are component blocks, not inline data.** Each chart renders as a fixed-height `ChartBlock` (320px desktop, 280px mobile). The component code is generated locally via `specToCode` — it is never transmitted from the server and never sent to the model.
4. **Tool parts are placeholders until resolved.** While streaming, tool parts show a skeleton. Only the resolved payload is rendered. No raw JSON leaks into the DOM.
5. **Empty state chips are data-derived.** Suggestion chips are built from the column profile (first numeric/string/date columns), not from a hardcoded list, so they stay cheap and relevant.

## Do not

- Do not call `fetch` in the page or components. The page prefetches with tRPC; the client reads through `useGetChat`.
- Do not add the AI route, `useChat`, or OpenRouter in this step.
- Do not add chart rendering yet. Render a neutral placeholder for tool parts; step 06 replaces it with `ChartBlock`.
- Do not add `react-markdown`. Use `streamdown`.

## Tasks

### 1. Streamdown CSS

Streamdown ships Tailwind classes. In `src/styles/globals.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "streamdown/styles.css";

@source "../../node_modules/streamdown/dist/*.js";
```

Keep the rest of the file unchanged. The `@source` path is relative to `src/styles/globals.css`.

### 2. Chat page (server)

Replace `src/app/(root)/c/[chatId]/page.tsx`:

```tsx
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { prefetchChat } from "@/features/chats/server/prefetch-chats";
import { HydrateClient } from "@/trpc/server";

import { ChatView } from "./_components/chat-view";

const page = async ({ params }: PageProps<"/c/[chatId]">) => {
  const { chatId } = await params;
  prefetchChat(chatId);

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<ChatError />}>
        <Suspense fallback={<ChatSkeleton />}>
          <ChatView chatId={chatId} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default page;
```

`ChatError` and `ChatSkeleton` are small local components in the same file. `ChatError` must show the message and a `Link` back to `/`. Keep the error boundary per-page (the layout is outside it, so the sidebar still works).

### 3. Types and helpers

Create `src/features/chats/types/index.ts` (if step 02 did not already) and add:

```ts
import type { UIMessage } from "ai";
import type { ColumnProfile } from "@/db/schema";

export type ChatListItem = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  dataset: { id: string; name: string; rowCount: number };
};

export type ChatDetail = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  dataset: {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    rowCount: number;
    columns: ColumnProfile[];
  };
  messages: Array<{
    id: string;
    role: UIMessage["role"];
    parts: UIMessage["parts"];
  }>;
};

export type ChatUIMessage = UIMessage;
```

Add `src/features/chats/utils/to-ui-messages.ts`:

```ts
import type { UIMessage } from "ai";

import type { ChatDetail } from "@/features/chats/types";

export const toUiMessages = (chat: ChatDetail): UIMessage[] =>
  chat.messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: message.parts,
  }));
```

Export both from `src/features/chats/index.ts`.

### 4. Composer

Create `src/features/chats/components/composer/chat-composer.tsx` and `index.ts`.

```tsx
"use client";

import { useState } from "react";
import { ArrowUpIcon, SquareIcon } from "lucide-react";

import {
  Composer,
  ComposerActionGroup,
  ComposerActions,
  ComposerInput,
  ComposerSubmit,
  getComposerText,
  type ComposerValue,
} from "@/components/ui/composer";
import { Button } from "@/components/ui/button";

export function ChatComposer(props: {
  onSend: (text: string) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState<ComposerValue>([]);

  const submit = (next: ComposerValue) => {
    const text = getComposerText(next).trim();
    if (!text || props.disabled) return;
    props.onSend(text);
    setValue([]);
  };

  return (
    <Composer
      value={value}
      onValueChange={setValue}
      onSubmit={submit}
      submitDisabled={props.disabled}
      className="bg-background"
    >
      <ComposerInput placeholder={props.placeholder ?? "Ask about your data…"} />
      <ComposerActions>
        <ComposerActionGroup />
        <ComposerActionGroup align="end">
          {props.isStreaming ? (
            <Button size="icon-sm" variant="secondary" onClick={props.onStop} aria-label="Stop generating">
              <SquareIcon />
            </Button>
          ) : (
            <ComposerSubmit aria-label="Send message">
              <ArrowUpIcon />
            </ComposerSubmit>
          )}
        </ComposerActionGroup>
      </ComposerActions>
    </Composer>
  );
}
```

Notes:

- `Composer` renders a `<form>` and owns the editor context; `ComposerInput` and `ComposerActions` must be its direct children in that order.
- The composer is **controlled** with `value`/`onValueChange` so we can clear it after send (`setValue([])`).
- Do not attach a global `keydown` listener; the component already submits on Enter and inserts a newline on Shift+Enter.

### 5. Message list

Create `src/features/chats/components/message-list/` with `index.ts`, `message-list.tsx`, `message-item.tsx`, `user-message.tsx`, `assistant-message.tsx`, `reasoning-part.tsx`, `tool-part.tsx`, and `jump-to-latest.tsx`.

`message-item.tsx` switches on `message.role`:

- `user`: right-aligned bubble, `bg-muted`, max-width `min(42rem, 85%)`, whitespace-pre-wrap. Concatenate text parts; ignore non-text parts.
- `assistant`: full width, no bubble. Iterate `message.parts`:

```tsx
import { isReasoningUIPart, isTextUIPart, isToolUIPart, getToolName } from "ai";
import { Streamdown } from "streamdown";

{message.parts.map((part, index) => {
  if (isTextUIPart(part)) {
    return (
      <Streamdown
        key={index}
        mode={isStreaming ? "streaming" : "static"}
        className="prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
      >
        {part.text}
      </Streamdown>
    );
  }

  if (isReasoningUIPart(part)) {
    return <ReasoningPart key={index} text={part.text} />;
  }

  if (isToolUIPart(part)) {
    return <ToolPart key={part.toolCallId} name={getToolName(part)} part={part} />;
  }

  if (part.type === "step-start") {
    return <div key={index} className="bg-border my-4 h-px w-full" />;
  }

  return null;
})}
```

`ToolPart` (temporary placeholder, replaced in step 06):

- `input-streaming` / `input-available` → a small card "Preparing result…" with a `Skeleton`.
- `output-available` → a card with the tool name and "Result ready. Chart rendering arrives in step 06." 
- `output-error` → a destructive-tinted card with `part.errorText` (fall back to "The tool failed.").
- Never render raw JSON.

`ReasoningPart`:

- Use `Collapsible` + `CollapsibleTrigger` + `CollapsibleContent` from `@/components/ui/collapsible`.
- Trigger: small muted "Thinking" row with a chevron. Closed by default.
- Content: `Streamdown` with `text-muted-foreground text-sm`.

`message-list.tsx`:

```tsx
"use client";

import { useMemo } from "react";

import type { UIMessage } from "ai";

import { MessageItem } from "./message-item";
import { JumpToLatest } from "./jump-to-latest";
import { useStickToBottom } from "@/features/chats/hooks/use-stick-to-bottom";

export function MessageList(props: {
  messages: UIMessage[];
  isStreaming: boolean;
  emptyState?: React.ReactNode;
}) {
  const lastMessage = props.messages.at(-1);
  const contentKey = useMemo(
    () => `${props.messages.length}:${lastMessage?.parts.length ?? 0}`,
    [props.messages.length, lastMessage?.parts.length],
  );

  const { containerRef, isPinned, scrollToBottom } = useStickToBottom(contentKey);

  if (props.messages.length === 0) {
    return <div className="flex min-h-0 flex-1 items-center justify-center p-6">{props.emptyState}</div>;
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={containerRef} className="h-full overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
          {props.messages.map((message, index) => (
            <MessageItem
              key={message.id}
              message={message}
              isStreaming={props.isStreaming && index === props.messages.length - 1}
            />
          ))}
        </div>
      </div>
      {!isPinned ? <JumpToLatest onClick={scrollToBottom} /> : null}
    </div>
  );
}
```

`useStickToBottom` — create `src/features/chats/hooks/use-stick-to-bottom.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const THRESHOLD = 96;

export const useStickToBottom = (contentKey: string) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPinned, setIsPinned] = useState(true);
  const pinnedRef = useRef(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const element = containerRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior });
    pinnedRef.current = true;
    setIsPinned(true);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const onScroll = () => {
      const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
      const pinned = distance <= THRESHOLD;
      pinnedRef.current = pinned;
      setIsPinned(pinned);
    };

    element.addEventListener("scroll", onScroll, { passive: true });
    return () => element.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!pinnedRef.current) return;
    const element = containerRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [contentKey]);

  return { containerRef, isPinned, scrollToBottom };
};
```

Export it from `src/features/chats/hooks/index.ts`.

`JumpToLatest`: absolutely positioned at the bottom center of the scroll container, `Button variant="secondary" size="sm"` with a down-arrow icon, `onClick`.

### 6. Chat view

Create `src/app/(root)/c/[chatId]/_components/chat-view.tsx` (keep page-local UI in `_components`, shared pieces in `features/chats`).

```tsx
"use client";

import { useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChatComposer } from "@/features/chats/components/composer";
import { MessageList } from "@/features/chats/components/message-list";
import { useGetChat } from "@/features/chats/hooks";
import { toUiMessages } from "@/features/chats/utils/to-ui-messages";
import type { UIMessage } from "ai";

export function ChatView({ chatId }: { chatId: string }) {
  const { data: chat } = useGetChat(chatId);
  const [messages, setMessages] = useState<UIMessage[]>(() => toUiMessages(chat));
  const [isStreaming, setIsStreaming] = useState(false);

  // TEMPORARY — step 07 replaces this with useChat + /api/chat.
  const send = (text: string) => {
    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: userId, role: "user", parts: [{ type: "text", text }] },
      {
        id: assistantId,
        role: "assistant",
        parts: [
          { type: "step-start" },
          {
            type: "text",
            text: `**Streaming arrives in step 07.**\n\nYou asked: “${text}”\n\nThis dataset has **${chat.dataset.rowCount.toLocaleString()} rows** and **${chat.dataset.columns.length} columns**: ${chat.dataset.columns.slice(0, 8).map((column) => `\`${column.name}\``).join(", ")}.`,
          },
        ],
      },
    ]);
    setIsStreaming(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
        <SidebarTrigger />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-medium">{chat.title}</span>
          <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
            {chat.dataset.name}
          </Badge>
        </div>
        <span className="text-muted-foreground hidden shrink-0 text-xs sm:inline">
          {chat.dataset.rowCount.toLocaleString()} rows · {chat.dataset.columns.length} cols
        </span>
      </header>

      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        emptyState={<ChatEmptyState onPick={send} columns={chat.dataset.columns.map((column) => column.name)} />}
      />

      <div className="shrink-0 border-t bg-background/80 px-4 pt-3 pb-4 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl">
          <ChatComposer onSend={send} isStreaming={isStreaming} onStop={() => setIsStreaming(false)} />
          <p className="text-muted-foreground mt-2 text-center text-[11px]">
            Answers are generated from your uploaded dataset only.
          </p>
        </div>
      </div>
    </div>
  );
}
```

`ChatEmptyState` (same folder):

- Title "What do you want to know?"
- 4 suggestion chips derived from the dataset: e.g.
  - `Summarize this dataset`
  - `Show the top 10 rows by <first numeric column>`
  - `Chart <first numeric column> by <first string column>`
  - `What are the totals for <first numeric column>?`
- Use `Button variant="outline" size="sm"` in a `flex flex-wrap justify-center gap-2`.
- If there are no numeric/string columns, fall back to a single "Summarize this dataset" chip.
- Clicking a chip calls `onPick(prompt)`.

Import `cn` from `@/lib/utils` if needed. Use only installed primitives (`Badge`, `Button`, `Skeleton`, `Collapsible`).

### 7. Accessibility and polish

- Message thread is a `<div role="log" aria-live="polite">` wrapper or the list container gets `aria-label="Conversation"`.
- Composer input has an accessible placeholder; the send button has `aria-label`.
- Focus stays in the composer after submit.
- Header truncates long filenames instead of wrapping.
- No layout shift when the sidebar collapses.

## Acceptance criteria

- [ ] `/c/<chatId>` loads a stored chat without a client-side fetch in the page.
- [ ] Markdown renders (headings, bold, lists, tables, inline code, fenced code) and looks correct in light/dark mode.
- [ ] A stored assistant message with `tool-*` parts renders the placeholder card, not a crash or raw JSON.
- [ ] Composer: Enter sends, Shift+Enter adds a line, empty text does nothing, input clears after send.
- [ ] Auto-scroll sticks to the bottom while new content arrives; scrolling up shows "Jump to latest" and stops auto-scroll.
- [ ] Empty chat shows suggestion chips; clicking one sends that prompt through the temporary stub.
- [ ] Long chat scrolls inside the message area only; the header and composer stay fixed.
- [ ] `bun run lint` and `bun run build` pass.

When done, report which temporary stub code must be deleted in step 07 (`send`, `isStreaming`, and the local `messages` state in `chat-view.tsx`).
