import { z } from "zod";

export const createDatasetSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(128),
  sizeBytes: z.number().int().positive(),
  /** Raw base64 (no `data:` prefix). */
  data: z.string().min(1),
});

export type CreateDatasetSchema = z.infer<typeof createDatasetSchema>;
