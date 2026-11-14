import { z } from "zod";

export const queryDataOutputSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.union([z.string(), z.number(), z.null()]))),
  totalRows: z.number(),
  truncated: z.boolean(),
});

export type QueryDataOutput = z.infer<typeof queryDataOutputSchema>;

export const parseQueryDataOutput = (value: unknown) => {
  const result = queryDataOutputSchema.safeParse(value);
  return result.success ? result.data : null;
};
