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

  const mutation = useMutation(
    trpc.datasets.create.mutationOptions({
      onSuccess: ({ chatId }) => {
        toastManager.add({
          title: "Dataset ready",
          description: "Ask a question or request a chart.",
          type: "success",
        });
        queryClient.invalidateQueries(trpc.chats.getMany.queryOptions());
        router.push(`/c/${chatId}`);
      },
      onError: (error) => {
        toastManager.add({
          title: "Could not read this file",
          description: error.message,
          type: "error",
        });
      },
    }),
  );

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

      const data = await readFileAsBase64(file);

      mutation.mutate({
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        data,
      });
    },
  };
};
