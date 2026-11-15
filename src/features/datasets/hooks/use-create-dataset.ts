"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { useTRPC } from "@/trpc/client";
import { readFileAsBase64 } from "@/features/datasets/utils/read-file-as-base64";
import { MAX_FILE_BYTES, isSupportedFilename } from "@/features/datasets/utils/limits";

export const useCreateDataset = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation(trpc.datasets.create.mutationOptions());

  return {
    ...mutation,
    uploadFile: async (file: File) => {
      if (!isSupportedFilename(file.name)) {
        toastManager.add({
          title: "Unsupported file",
          description: "Upload a .csv or .xlsx file. Re-save .xls files as .xlsx.",
          type: "error",
        });
        return;
      }

      if (file.size > MAX_FILE_BYTES) {
        toastManager.add({
          title: "File too large",
          description: "Files must be 5 MB or smaller.",
          type: "error",
        });
        return;
      }

      try {
        const data = await readFileAsBase64(file);

        const result = await mutation.mutateAsync({
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          data,
        });

        toastManager.add({
          title: "Dataset ready",
          description: "Pick a suggested question or ask your own.",
          type: "success",
        });
        void queryClient.invalidateQueries(trpc.chats.getMany.queryOptions());
        router.push(`/c/${result.chatId}`);
      } catch (error) {
        toastManager.add({
          title: "Could not read this file",
          description: error instanceof Error ? error.message : "Something went wrong.",
          type: "error",
        });
      }
    },
  };
};
