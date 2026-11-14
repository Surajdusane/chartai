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
