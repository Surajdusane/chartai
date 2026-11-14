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