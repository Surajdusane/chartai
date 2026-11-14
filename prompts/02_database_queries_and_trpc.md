# 02 — Database queries, tRPC routers, and React Query hooks

**Read `AGENTS.md` at the repository root first and strictly follow it.**

> Step 2 of 9. Step 01 is complete: tables exist in Neon, the app builds, and `appRouter` only has a `health` router.

## Goal

Build the whole data layer for chats and datasets, exposed strictly through tRPC, with one hook per query/mutation and toasts on every mutation. No UI yet.

## Data contract

These shapes are used by every later step. Put them in `src/features/chats/types/index.ts` and export them from `src/features/chats/index.ts`.

```ts
import type { ColumnProfile } from "@/db/schema";

export type ChatListItem = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  dataset: {
    id: string;
    name: string;
    rowCount: number;
  };
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
    role: "system" | "user" | "assistant";
    parts: unknown[];
  }>;
};
```

## Tasks

### 1. tRPC input schemas

Create `src/trpc/schema/chat.ts`:

```ts
import { z } from "zod";

export const getChatSchema = z.object({
  id: z.string().min(1),
});

export const renameChatSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(80),
});

export const deleteChatSchema = z.object({
  id: z.string().min(1),
});

export type GetChatSchema = z.infer<typeof getChatSchema>;
export type RenameChatSchema = z.infer<typeof renameChatSchema>;
export type DeleteChatSchema = z.infer<typeof deleteChatSchema>;
```

Export it from `src/trpc/schema/index.ts`:

```ts
export * from "./chat";
```

### 2. Query functions

Use Drizzle's relational query builder (`db.query.*`) for reads, and `eq`/`db.batch` for writes. The Neon HTTP driver does **not** support interactive transactions, so never call `db.transaction()`.

Create `src/db/queries/chats.ts`:

```ts
import { eq } from "drizzle-orm";

import type { Database } from "@/db";
import type { UIMessage } from "ai";

import { chats, datasets, messages } from "../schema";

export const getChats = async (db: Database) => {
  return db.query.chats.findMany({
    columns: { id: true, title: true, createdAt: true, updatedAt: true },
    with: {
      dataset: { columns: { id: true, name: true, rowCount: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
};

export const getChatById = async (db: Database, id: string) => {
  return db.query.chats.findFirst({
    where: { id },
    with: {
      // Never ship `dataset.rows` to the client — profile columns only.
      dataset: {
        columns: {
          id: true,
          name: true,
          mimeType: true,
          sizeBytes: true,
          rowCount: true,
          columns: true,
        },
      },
      messages: { orderBy: { sortOrder: "asc" } },
    },
  });
};

export const getChatWithDataset = async (db: Database, id: string) => {
  return db.query.chats.findFirst({
    where: { id },
    with: { dataset: true },
  });
};

export const createChat = async (
  db: Database,
  input: { id: string; title: string; datasetId: string },
) => {
  const [chat] = await db.insert(chats).values(input).returning();
  return chat;
};

export const renameChat = async (db: Database, input: { id: string; title: string }) => {
  const [chat] = await db
    .update(chats)
    .set({ title: input.title, updatedAt: new Date() })
    .where(eq(chats.id, input.id))
    .returning();
  return chat;
};

export const touchChat = async (db: Database, id: string) => {
  await db.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, id));
};

/**
 * Deleting the dataset cascades to the chat and its messages
 * (see the onDelete: "cascade" FKs in src/db/schema.ts).
 */
export const deleteChat = async (db: Database, id: string) => {
  const chat = await db.query.chats.findFirst({
    where: { id },
    columns: { id: true, datasetId: true },
  });
  if (!chat) return null;

  await db.delete(datasets).where(eq(datasets.id, chat.datasetId));
  return chat;
};

export const getChatMessages = async (db: Database, chatId: string): Promise<UIMessage[]> => {
  const rows = await db.query.messages.findMany({
    where: { chatId },
    orderBy: { sortOrder: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    parts: row.parts,
  })) as UIMessage[];
};

/**
 * Replaces the stored history for a chat. The Neon HTTP driver has no
 * interactive transactions, so delete + insert + touch run as one batch.
 */
export const saveChatMessages = async (
  db: Database,
  input: { chatId: string; messages: UIMessage[] },
) => {
  const deleteQuery = db.delete(messages).where(eq(messages.chatId, input.chatId));
  const touchQuery = db.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, input.chatId));

  if (input.messages.length === 0) {
    await db.batch([deleteQuery, touchQuery]);
    return;
  }

  const rows = input.messages.map((message, index) => ({
    id: message.id,
    chatId: input.chatId,
    role: message.role,
    parts: message.parts,
    sortOrder: index,
  }));

  await db.batch([deleteQuery, db.insert(messages).values(rows), touchQuery]);
};
```

Create `src/db/queries/datasets.ts`:

```ts
import { eq } from "drizzle-orm";

import type { Database } from "@/db";
import type { ColumnProfile, DatasetRow } from "@/db/schema";

import { datasets } from "../schema";

export const createDataset = async (
  db: Database,
  input: {
    name: string;
    mimeType: string;
    sizeBytes: number;
    rowCount: number;
    columns: ColumnProfile[];
    rows: DatasetRow[];
  },
) => {
  const [dataset] = await db.insert(datasets).values(input).returning();
  return dataset;
};

export const getDatasetById = async (db: Database, id: string) => {
  return db.query.datasets.findFirst({ where: { id } });
};

export const deleteDataset = async (db: Database, id: string) => {
  await db.delete(datasets).where(eq(datasets.id, id));
};
```

Replace `src/db/queries/index.ts` with a barrel:

```ts
export * from "./chats";
export * from "./datasets";
```

`src/db/queries/utils.ts` is currently empty — leave it alone or delete it only if nothing imports it.

### 3. tRPC routers

Create `src/trpc/routers/chats.ts`:

```ts
import { TRPCError } from "@trpc/server";

import {
  deleteChat,
  getChatById,
  getChats,
  renameChat,
} from "@/db/queries";
import { createTRPCRouter } from "@/trpc/init";
import { authorizedProcedure } from "@/trpc/procedures/authorizedProcedure";
import { deleteChatSchema, getChatSchema, renameChatSchema } from "@/trpc/schema";

export const chatsRouter = createTRPCRouter({
  getMany: authorizedProcedure.query(async ({ ctx: { db } }) => {
    return getChats(db);
  }),

  getById: authorizedProcedure.input(getChatSchema).query(async ({ ctx: { db }, input }) => {
    const chat = await getChatById(db, input.id);
    if (!chat) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Chat not found." });
    }
    return chat;
  }),

  rename: authorizedProcedure.input(renameChatSchema).mutation(async ({ ctx: { db }, input }) => {
    const chat = await renameChat(db, input);
    if (!chat) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Chat not found." });
    }
    return chat;
  }),

  remove: authorizedProcedure.input(deleteChatSchema).mutation(async ({ ctx: { db }, input }) => {
    const chat = await deleteChat(db, input.id);
    if (!chat) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Chat not found." });
    }
    return chat;
  }),
});
```

Update `src/trpc/routers/_app.ts`:

```ts
import { createTRPCRouter } from "@/trpc/init";

import { chatsRouter } from "./chats";
import { healthRouter } from "./health";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  chats: chatsRouter,
});

export type AppRouter = typeof appRouter;
```

Do **not** register a `datasets` router yet; step 03 adds it. Do not add a `messages` router: chat messages are written only by the streaming route in step 07.

### 4. Hooks (one per query/mutation)

Create these under `src/features/chats/hooks/`. Every mutation must invalidate the affected queries and show a `toastManager` message on success and error.

`src/features/chats/hooks/use-get-chats.ts`:

```ts
"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";

export const useGetChats = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.chats.getMany.queryOptions());
};
```

`src/features/chats/hooks/use-get-chat.ts`:

```ts
"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";

export const useGetChat = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.chats.getById.queryOptions({ id }));
};
```

`src/features/chats/hooks/use-rename-chat.ts`:

```ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { useTRPC } from "@/trpc/client";

export const useRenameChat = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.chats.rename.mutationOptions({
      onSuccess: (chat) => {
        toastManager.add({
          title: "Chat renamed",
          description: `Saved as “${chat.title}”.`,
          type: "success",
        });
        queryClient.invalidateQueries(trpc.chats.getMany.queryOptions());
        queryClient.invalidateQueries(trpc.chats.getById.queryOptions({ id: chat.id }));
      },
      onError: (error) => {
        toastManager.add({
          title: "Could not rename chat",
          description: error.message,
          type: "error",
        });
      },
    }),
  );
};
```

`src/features/chats/hooks/use-delete-chat.ts`:

```ts
"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { useTRPC } from "@/trpc/client";

export const useDeleteChat = (activeChatId?: string) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation(
    trpc.chats.remove.mutationOptions({
      onSuccess: (chat) => {
        toastManager.add({
          title: "Chat deleted",
          description: "The chat and its dataset were removed.",
          type: "success",
        });
        queryClient.removeQueries(trpc.chats.getById.queryOptions({ id: chat.id }));
        queryClient.invalidateQueries(trpc.chats.getMany.queryOptions());

        if (activeChatId === chat.id) {
          router.push("/");
        }
      },
      onError: (error) => {
        toastManager.add({
          title: "Could not delete chat",
          description: error.message,
          type: "error",
        });
      },
    }),
  );
};
```

`src/features/chats/hooks/index.ts`:

```ts
export * from "./use-delete-chat";
export * from "./use-get-chat";
export * from "./use-get-chats";
export * from "./use-rename-chat";
```

`src/features/chats/index.ts`:

```ts
export * from "./hooks";
export type * from "./types";
```

### 5. Server prefetch helpers

Create `src/features/chats/server/prefetch-chats.ts`:

```ts
import { prefetch, trpc } from "@/trpc/server";

export const prefetchChats = () => prefetch(trpc.chats.getMany.queryOptions());

export const prefetchChat = (id: string) =>
  prefetch(trpc.chats.getById.queryOptions({ id }));
```

Do **not** re-export the server helper from `src/features/chats/index.ts` — keep the barrel client-safe and import `@/features/chats/server/prefetch-chats` directly in server pages.

## Acceptance criteria

- [ ] `trpc.chats.getMany`, `trpc.chats.getById`, `trpc.chats.rename`, `trpc.chats.remove` exist and are typed end-to-end.
- [ ] Reads use `db.query.*`; writes use `insert`/`update`/`delete`; no `db.transaction()` anywhere.
- [ ] `trpc.chats.getById` never returns `dataset.rows` (check the network response).
- [ ] `saveChatMessages` works with 0 and with N messages and never calls `.values([])`.
- [ ] Every hook in `src/features/chats/hooks` is a client hook that uses `useTRPC` and `toastManager`.
- [ ] Deleting a chat removes its dataset and therefore its messages.
- [ ] `bun run lint` and `bun run build` pass.
- [ ] No page or component was built in this step.

Verification (optional, no UI required): start `bun run dev` and open:

```
/api/trpc/chats.getMany?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D
```

It must return `{"0":{"result":{"data":{"json":[]}}}}` (SuperJSON may wrap it slightly differently — the important part is HTTP 200 and no router error).

When done, report the files created and the final router shape.
