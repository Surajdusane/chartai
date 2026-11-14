# 01 — Fix the scaffold, install dependencies, create the database schema

**Read `AGENTS.md` at the repository root first and strictly follow it.**

> Step 1 of 9. Nothing has been built yet. This step only makes the repository compile, installs the AI/parsing dependencies, and creates the Postgres schema. No UI, no AI calls.

## Goal

1. The project compiles again (`src/trpc/routers/_app.ts` currently imports routers that do not exist).
2. All dependencies needed by later steps are installed.
3. `src/db/schema.ts` defines the three tables and the `relations` export that `src/db/index.ts` already expects.
4. The tables exist in Neon.

## Do not

- Do not build any UI, upload flow, chart code, or AI route in this step.
- Do not install a chart library other than the ones already in the repo.
- Do not remove `src/components/evilcharts` or any installed UI component.
- Do not create a commit or branch.

## Tasks

### 1. Install dependencies

Use `bun` (this repo uses Bun).

```bash
bun add ai@^7 @ai-sdk/react@^4 @openrouter/ai-sdk-provider@^3 papaparse@^5 exceljs@^4 streamdown@^2
bun add -d @types/papaparse drizzle-kit@rc dotenv
```

Notes:

- `ai@7` exports `streamText`, `convertToModelMessages`, `validateUIMessages`, `toUIMessageStream`, `createUIMessageStreamResponse`, `isStepCount`, `tool`, `generateText`, `generateId`.
- `@ai-sdk/react@4` is the client half that pairs with `ai@7` (`useChat`, `DefaultChatTransport`).
- `drizzle-kit@rc` must match `drizzle-orm@^1.0.0-rc.5`. The `latest` dist-tag of `drizzle-kit` is the old 0.31 line and does **not** understand the v1 schema API.
- `streamdown` renders streaming markdown. Do not add `react-markdown`.

Add scripts to `package.json`:

```json
{
  "scripts": {
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

### 2. Environment files

Create `.env.example` at the repository root:

```env
# Neon Postgres connection string (already set in .env for local dev)
DATABASE_URL=

# OpenRouter
OPENROUTER_API_KEY=

# Any OpenRouter model that supports tool calling.
# Example format: <provider>/<model>
OPENROUTER_MODEL=
```

Leave the existing `.env` alone; only ask the user to add `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` if they are missing.

### 3. Next config

In `next.config.ts`, keep the existing `turbopack` block and add `serverExternalPackages` so ExcelJS stays a server-side Node dependency:

```ts
const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};
```

### 4. Database schema

Replace the empty `src/db/schema.ts` with the following. Keep the exported type names; later steps import them.

```ts
import type { UIMessage } from "ai";
import { defineRelations } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export type DatasetValue = string | number | boolean | null;
export type DatasetRow = Record<string, DatasetValue>;
export type ColumnType = "number" | "date" | "string" | "boolean";

export type ColumnProfile = {
  name: string;
  type: ColumnType;
  nullCount: number;
  uniqueCount: number;
  /** Numeric/date summary, only for number and date columns. */
  min?: number | string;
  max?: number | string;
  mean?: number;
  /** Top 5 values for string/boolean columns. */
  topValues?: string[];
  /** Up to 3 non-null values, for display in prompts and the dataset chip. */
  sampleValues: string[];
  /** Detected display unit, e.g. "$", "EUR", "%", when every sampled value carried it. */
  unit?: string;
};

export const datasets = pgTable("datasets", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  rowCount: integer("row_count").notNull(),
  columns: jsonb("columns").$type<ColumnProfile[]>().notNull(),
  rows: jsonb("rows").$type<DatasetRow[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const chats = pgTable(
  "chats",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => datasets.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("chats_updated_at_idx").on(table.updatedAt)],
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    chatId: text("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    role: text("role").$type<UIMessage["role"]>().notNull(),
    parts: jsonb("parts").$type<UIMessage["parts"]>().notNull(),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("messages_chat_sort_idx").on(table.chatId, table.sortOrder)],
);

// drizzle v1 relations. src/db/index.ts passes `relations: schema.relations`,
// so this export must exist.
export const relations = defineRelations({ datasets, chats, messages }, (r) => ({
  datasets: {
    chats: r.many.chats(),
  },
  chats: {
    dataset: r.one.datasets({
      from: r.chats.datasetId,
      to: r.datasets.id,
    }),
    messages: r.many.messages(),
  },
  messages: {
    chat: r.one.chats({
      from: r.messages.chatId,
      to: r.chats.id,
    }),
  },
}));
```

Notes:

- `defineRelations` receives an object of tables (not `import * as schema`), which is why the tables are listed explicitly.
- `messages.role` stores `"user" | "assistant" | "system"` using the AI SDK's own type so stored parts round-trip through `UIMessage`.
- Do not create a `sessions`/`users` table. There is no auth in this product yet.

### 5. Drizzle config

Create `drizzle.config.ts` at the repository root:

```ts
import "dotenv/config";

import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and add your Neon connection string.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: false,
});
```

Add `drizzle/` to `.gitignore` only if it is not already ignored — migrations are generated artifacts here and the user has not asked to keep them. If the folder is already tracked, leave it.

### 6. Fix the broken tRPC router

`src/trpc/routers/_app.ts` currently imports eight routers that do not exist. Replace it with a single temporary health router so the app compiles. Step 02 replaces this again.

Create `src/trpc/routers/health.ts`:

```ts
import { createTRPCRouter } from "@/trpc/init";
import { authorizedProcedure } from "@/trpc/procedures/authorizedProcedure";

export const healthRouter = createTRPCRouter({
  ping: authorizedProcedure.query(() => ({ ok: true })),
});
```

`authorizedProcedure` is currently an alias of `baseProcedure` (no auth in this product). Keep using it everywhere so adding auth later is a one-file change.

Then `src/trpc/routers/_app.ts`:

```ts
import { createTRPCRouter } from "@/trpc/init";

import { healthRouter } from "./health";

export const appRouter = createTRPCRouter({
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
```

### 7. Push the schema

```bash
bunx drizzle-kit push
```

If `push` asks for confirmation about creating tables, accept. Then verify in Neon (or `bunx drizzle-kit studio`) that `datasets`, `chats`, and `messages` exist with the expected columns and indexes.

## Acceptance criteria

- [ ] `src/trpc/routers/_app.ts` no longer references `customers`, `devices`, `impact`, `leads`, `overview`, `revenue`, `societies`, or `service-ops`.
- [ ] `src/db/schema.ts` exports `datasets`, `chats`, `messages`, `relations`, `ColumnProfile`, `DatasetRow`, and `DatasetValue`.
- [ ] `bun run lint` passes.
- [ ] `bun run build` passes (it must still pass with `DATABASE_URL` unset, because `getDb()` is lazy).
- [ ] `bunx drizzle-kit push` created the three tables in Neon.
- [ ] `.env.example` exists and lists `DATABASE_URL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`.
- [ ] No UI, upload, chart, or AI code was added in this step.

When done, report exactly which files changed and paste the output of `bun run lint` and `bun run build`.
