import { TRPCError } from "@trpc/server";

import { createChat, createDataset, deleteDataset } from "@/db/queries";
import { createTRPCRouter } from "@/trpc/init";
import { authorizedProcedure } from "@/trpc/procedures/authorizedProcedure";
import { createDatasetSchema } from "@/trpc/schema";
import { createDatasetTitle } from "@/features/datasets/utils/create-dataset-title";
import { MAX_FILE_BYTES } from "@/features/datasets/utils/limits";
import { DatasetParseError, parseDatasetFile } from "@/features/datasets/server";

export const datasetsRouter = createTRPCRouter({
  create: authorizedProcedure.input(createDatasetSchema).mutation(async ({ ctx: { db }, input }) => {
    if (input.sizeBytes > MAX_FILE_BYTES) {
      throw new TRPCError({
        code: "PAYLOAD_TOO_LARGE",
        message: "Files must be 5 MB or smaller.",
      });
    }

    const buffer = Buffer.from(input.data, "base64");
    if (buffer.byteLength > MAX_FILE_BYTES) {
      throw new TRPCError({
        code: "PAYLOAD_TOO_LARGE",
        message: "Files must be 5 MB or smaller.",
      });
    }

    let parsed;
    try {
      parsed = await parseDatasetFile({
        filename: input.filename,
        mimeType: input.mimeType,
        buffer,
      });
    } catch (error) {
      if (error instanceof DatasetParseError) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      }
      throw error;
    }

    const dataset = await createDataset(db, parsed);

    try {
      const chat = await createChat(db, {
        id: crypto.randomUUID(),
        title: createDatasetTitle(input.filename),
        datasetId: dataset.id,
      });

      return { chatId: chat.id, datasetId: dataset.id };
    } catch (error) {
      // Keep Neon clean if the chat insert fails after the dataset insert.
      await deleteDataset(db, dataset.id);
      throw error;
    }
  }),
});
