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
