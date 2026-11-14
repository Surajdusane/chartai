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
