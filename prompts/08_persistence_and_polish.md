# 08 — Persistence polish, titles, regenerate, and responsive UX

Read `AGENTS.md` at the repository root first and strictly follow it.

> Step 8 of 9. Step 07 is complete: chat streams over SSE, both tools work, and messages persist on stream end.

## Goal

Make the chat feel finished:

- the first exchange auto-titles the chat (and the title appears without a manual refresh),
- regenerate and copy actions on the last answer,
- a clear streaming/thinking state and a stopped state,
- follow-up suggestion chips based on the dataset,
- reliable auto-scroll when charts grow the thread,
- responsive layout that holds up from 390px to 1440px.

## Do not

- Do not add a second AI endpoint. Titles use `generateText` from the existing server module, called from the existing `onEnd` path.
- Do not regenerate titles on every turn; only when the chat still has its auto-generated title.
- Do not add `window.location.reload()` anywhere.
- Do not change the SSE protocol or client transport.

## 1. Title generation

`src/features/chats/server/generate-title.ts`:

```ts
import "server-only";

import { generateText, isTextUIPart, type UIMessage } from "ai";

import { getChatModel } from "@/features/assistant/server/model";

const MAX_TITLE_LENGTH = 60;
const TITLE_TIMEOUT_MS = 2_000;

const textOf = (message: UIMessage) =>
  message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

const cleanTitle = (value: string) =>
  value
    .replace(/^["'`#*\s]+|["'`#*\s]+$/g, "")
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .slice(0, MAX_TITLE_LENGTH)
    .trim();

export const generateChatTitle = async (messages: UIMessage[]): Promise<string | null> => {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser) return null;

  const firstAnswer = messages.find((message) => message.role === "assistant");
  const prompt = [
    `User: ${textOf(firstUser).slice(0, 500)}`,
    firstAnswer ? `Assistant: ${textOf(firstAnswer).slice(0, 500)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), TITLE_TIMEOUT_MS);
  });

  const generation = generateText({
    model: getChatModel(),
    system:
      "Write a title for this data chat. 3 to 6 words, sentence case, no quotes, no trailing punctuation, no emoji. Reply with the title only.",
    prompt,
    maxOutputTokens: 24,
    temperature: 0.2,
  }).then((result) => cleanTitle(result.text) || null);

  return Promise.race([generation, timeout]).catch(() => null);
};
```

`setTimeout` in a route module is fine; the 2-second race bounds the background call so it cannot hang the serverless invocation.

## 2. Wire titles into the stream end

Generate the title **after** the response finishes, with Next's `after()`. Do not await it inside `onEnd`: `onEnd` blocks the stream's final flush, so a slow title call would keep the client stuck in `streaming` for up to 2 seconds after the answer is already visible.

In `src/app/api/chat/route.ts`:

```ts
import { after } from "next/server";

import { createDatasetTitle } from "@/features/datasets/utils/create-dataset-title";
import { generateChatTitle } from "@/features/chats/server/generate-title";
import { renameChat } from "@/db/queries";

onEnd: async ({ messages: finalMessages, isCancelled }) => {
  const persistable = finalMessages.filter(
    (message) => message.role !== "assistant" || message.parts.length > 1,
  );

  try {
    await saveChatMessages(db, { chatId: chat.id, messages: persistable });
  } catch (error) {
    console.error("[chat] could not persist messages", error);
    return;
  }

  // A stopped answer is saved, but it should not become the chat's title.
  if (isCancelled) return;

  // Only rename chats that still carry the name derived from the uploaded file.
  const isAutoTitle = chat.title === createDatasetTitle(chat.dataset.name);
  const isFirstAnswer = persistable.filter((message) => message.role === "user").length <= 1;

  if (!isAutoTitle || !isFirstAnswer) return;

  after(async () => {
    try {
      const title = await generateChatTitle(persistable);
      if (title) {
        await renameChat(db, { id: chat.id, title });
      }
    } catch (error) {
      console.error("[chat] could not generate a title", error);
    }
  });
},
```

`after` keeps the serverless function alive until the callback settles, after the client already has its full response.

Notes:

- `createDatasetTitle` already exists from step 03; import it, do not duplicate it.
- A user who renamed the chat keeps their title because `chat.title` no longer matches the file-derived name.
- `renameChat` also touches `updatedAt`, so the chat jumps to the top of the sidebar.
- Guard `after` with a `try/catch`; a title failure must never throw in the background.
- If `after` runs on an environment that does not support it, the title simply stays file-derived. Never block the response on it.

## 3. Refresh the title in the UI

The title lands a moment **after** the stream closes, so one invalidation is not enough. In `useChatSession`, invalidate immediately (status, sidebar ordering) and again after a short delay (title):

```ts
onFinish: () => {
  const invalidate = () => {
    queryClient.invalidateQueries(trpc.chats.getMany.queryOptions());
    queryClient.invalidateQueries(trpc.chats.getById.queryOptions({ id: input.chatId }));
  };

  invalidate();
  // The title is written in `after()` once the response is done.
  setTimeout(invalidate, 2_500);
},
```

Do not poll in a loop. A single delayed invalidation plus the default refetch-on-focus behavior is enough; a missed title resolves on the next navigation.

`ChatView` keeps using `chat.title` from `useGetChat`; when the refetch lands the header text updates. Do **not** pass `chat.messages` back into `useChat` — `initialMessages` stays the initializer only.

Also set the document title:

```tsx
useEffect(() => {
  document.title = `${chat.title} · Chart AI`;
}, [chat.title]);
```

## 4. Regenerate + copy actions

Create `src/features/chats/components/message-list/message-actions.tsx`:

```tsx
"use client";

import { CheckIcon, CopyIcon, RotateCcwIcon } from "lucide-react";
import { useState } from "react";
import { isTextUIPart, type UIMessage } from "ai";

import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";

const textOf = (message: UIMessage) =>
  message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("\n\n")
    .trim();

export function MessageActions(props: {
  message: UIMessage;
  canRegenerate: boolean;
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = textOf(props.message);
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1_500);
    } catch {
      toastManager.add({
        title: "Could not copy",
        description: "Your browser blocked clipboard access.",
        type: "error",
      });
    }
  };

  return (
    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
      <Button size="icon-sm" variant="ghost" onClick={copy} aria-label="Copy answer">
        {copied ? <CheckIcon /> : <CopyIcon />}
      </Button>
      {props.canRegenerate ? (
        <Button size="icon-sm" variant="ghost" onClick={props.onRegenerate} aria-label="Regenerate answer">
          <RotateCcwIcon />
        </Button>
      ) : null}
    </div>
  );
}
```

- `AssistantMessage` gets `group` on its wrapper and renders `MessageActions` at the bottom, only when `!isStreaming`.
- `canRegenerate` is true only for the last assistant message.
- Keep the buttons reachable by keyboard: `focus-within:opacity-100` covers that. On touch screens, use `opacity-100 sm:opacity-0` so the actions are visible without hover.

`MessageList` needs two new props: `onRegenerate?: () => void` and `regenerating?: boolean`. `ChatView` passes `onRegenerate={() => void regenerate()}`.

While regenerating (`status === "submitted"` after a regenerate), show the thinking row below the last user message.

## 5. Thinking + stopped states

`src/features/chats/components/message-list/thinking-indicator.tsx`:

```tsx
"use client";

import { Spinner } from "@/components/ui/spinner";

export function ThinkingIndicator({ label = "Thinking…" }: { label?: string }) {
  return (
    <div className="text-muted-foreground flex items-center gap-2 text-sm" role="status" aria-live="polite">
      <Spinner className="size-3.5" />
      <span>{label}</span>
    </div>
  );
}
```

Render rules in `ChatView`:

- `status === "submitted"` → `<ThinkingIndicator />` below the messages.
- `status === "streaming"` and the last assistant message has no text yet → `ThinkingIndicator label="Reading your dataset…"`.
- `status === "ready"` and the last message was aborted → show a muted "Stopped" label next to the actions. Track it with a local `wasStopped` state set in `stop()`:

```tsx
const handleStop = () => {
  setWasStopped(true);
  void stop();
};
```

Reset `wasStopped` when a new message is sent or regenerated.

The composer already swaps Send for Stop while streaming. Keep `submitDisabled={isStreaming}`.

## 6. Follow-up chips

`src/features/chats/components/follow-up-chips.tsx`:

```tsx
"use client";

import type { ColumnProfile } from "@/db/schema";
import { Button } from "@/components/ui/button";

const find = (columns: ColumnProfile[], type: ColumnProfile["type"]) =>
  columns.find((column) => column.type === type)?.name;

export function FollowUpChips(props: {
  columns: ColumnProfile[];
  onPick: (prompt: string) => void;
  disabled?: boolean;
}) {
  const numeric = find(props.columns, "number");
  const category = find(props.columns, "string");
  const date = find(props.columns, "date");

  const prompts = [
    numeric && category ? `Break down ${numeric} by ${category}` : null,
    numeric && date ? `Show the trend of ${numeric} over ${date}` : null,
    numeric ? `Top 10 rows by ${numeric}` : null,
    `What stands out in this dataset?`,
  ].filter((prompt): prompt is string => Boolean(prompt));

  return (
    <div className="flex flex-wrap gap-2">
      {prompts.slice(0, 3).map((prompt) => (
        <Button
          key={prompt}
          size="sm"
          variant="outline"
          disabled={props.disabled}
          onClick={() => props.onPick(prompt)}
        >
          {prompt}
        </Button>
      ))}
    </div>
  );
}
```

Render it directly above the composer only when `status === "ready"` and the thread has at least one assistant message and at most 8 messages. Hide it when an error is showing.

## 7. Scroll reliability with growing charts

Charts mount after their tool part resolves, changing height without changing the message-part count. Update `useStickToBottom`:

- keep a `ResizeObserver` on the inner content element and re-pin when the user is already pinned,
- keep the existing `contentKey` effect,
- return `contentRef` for the inner wrapper.

Implementation sketch:

```ts
const contentRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const content = contentRef.current;
  if (!content) return;

  const observer = new ResizeObserver(() => {
    if (!pinnedRef.current) return;
    const element = containerRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  });

  observer.observe(content);
  return () => observer.disconnect();
}, []);
```

Attach `ref={contentRef}` to the `max-w-3xl` inner div in `MessageList`. Do not observe the scroll container itself.

Also: when a chart block mounts inside the last message while the user is pinned, the observer handles it. When the user has scrolled up, charts still mount but must **not** yank the viewport.

## 8. Responsive polish

Apply these adjustments (keep Tailwind classes, no inline styles):

- `ChatView` header: `h-13 sm:h-14`, `px-2 sm:px-3`; the dataset `Badge` is `hidden md:inline-flex max-w-40 truncate`; row/column counts are `hidden lg:inline`.
- Message thread: `gap-6 sm:gap-8`, `px-3 sm:px-4`, `py-6 sm:py-8`.
- User bubble: `max-w-[85%] sm:max-w-[75%]`.
- Composer shell: `px-2 pb-3 sm:px-4 sm:pb-4`; helper text `hidden sm:block`.
- `ChartBlock` chart area: `h-[280px] sm:h-[340px]` instead of a fixed 320; the data/code areas stay `h-[300px]`.
- `ChartBlock` header: stack the title and tabs on `max-sm` (`flex-col items-start gap-2 sm:flex-row`).
- `ResultTable`: keep horizontal scroll; never wrap cells.
- `FollowUpChips`: wrap, and hide the third chip below `sm` (`hidden sm:inline-flex`).
- Verify no horizontal scrollbar at 390px.

## 9. Small correctness fixes

- **Double send:** guard `send` with `if (isStreaming) return;` and keep the composer disabled. `sendMessage` is async; do not await it in the handler.
- **Regenerate with no messages:** hide the regenerate action when there is no user message.
- **Empty assistant messages:** `onEnd` already filters assistant messages with only a `step-start`. Keep that filter after adding titles.
- **Chat switch:** `useChat` is created with `id={chatId}`. When navigating to another chat, the page remounts with a new `chatId`; do not reuse the hook state across chats.
- **Sidebar delete while streaming:** `stop()` first, then delete. In `ChatItem`, the delete confirmation flow should call `stop`? It does not have access; instead the route abort signal cancels generation when the request is aborted on navigation. Do not add global state for this.
- **Stale IDs:** never generate message ids on the client with `crypto.randomUUID()`; `useChat` does it.

## Acceptance criteria

- [ ] The first successful exchange renames the chat to a 3-6 word title, visible in the sidebar and header without a hard refresh.
- [ ] A manually renamed chat is never auto-titled again.
- [ ] Title generation never delays the stream (it runs in `after()`), and a title failure never errors the chat.
- [ ] Regenerate replaces the last answer (text + tool parts) instead of appending a duplicate.
- [ ] Stop leaves the partial answer visible, marks it "Stopped", and it survives a reload.
- [ ] Copy writes the assistant's text and shows the check for ~1.5s; a denied clipboard shows an error toast.
- [ ] Follow-up chips send a prompt, are disabled while streaming, and disappear in long threads.
- [ ] Charts that mount after streaming do not break auto-scroll; scrolling up still disables it.
- [ ] No horizontal scroll at 390×844; charts, tables, and code blocks stay inside the card.
- [ ] `bun run lint` and `bun run build` pass.

Test the title path twice: once with a fresh upload (title changes) and once after renaming a chat (title stays).

When done, report the before/after titles for both cases and a 390px screenshot description of a chart message.
