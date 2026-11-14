"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardPasteIcon, FileUpIcon, FolderOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { toastManager } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { SAMPLES } from "@/features/datasets/utils/samples";
import { useCreateDataset } from "@/features/datasets/hooks/use-create-dataset";

const ACCEPT_ATTRIBUTE = ".csv,.xlsx";

type DropzoneProps = {
  onFiles?: (files: File[]) => void;
};

export const FileDropzone = ({ onFiles }: DropzoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const { uploadFile, isPending } = useCreateDataset();

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((file) => file.size > 0);
      if (files.length > 0) {
        if (onFiles) {
          onFiles(files);
        } else {
          if (files.length > 1) {
            toastManager.add({
              title: "Multiple files",
              description: "Only the first file will be used.",
              type: "info",
            });
          }
          void uploadFile(files[0]);
        }
      }
    },
    [onFiles, uploadFile],
  );

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []).filter(
        (file) => file.size > 0,
      );
      if (files.length > 0) {
        handleFiles(files);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [handleFiles]);

  return (
    <div
      className={cn(
        "relative flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-card/40 px-6 py-10 text-center transition-colors",
        dragging
          ? "border-primary bg-accent/50"
          : "border-input hover:border-muted-foreground/50",
        isPending && "opacity-70 pointer-events-none",
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepth.current -= 1;
        if (dragDepth.current <= 0) {
          dragDepth.current = 0;
          setDragging(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        onChange={(event) => {
          handleFiles(event.target.files ?? []);
          event.target.value = "";
        }}
        disabled={isPending}
      />

      <Empty className="gap-5 py-0 md:py-0 w-full max-w-xl">
        <EmptyMedia variant="icon" className="mb-4">
          <FileUpIcon className="size-5" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle className="text-2xl">
            {isPending ? "Parsing your dataset…" : "Drop a spreadsheet here"}
          </EmptyTitle>
          <EmptyDescription className="mt-1 max-w-sm">
            {isPending
              ? "We're reading your CSV or Excel file. This may take a moment."
              : "CSV or XLSX · up to 5 MB · max 20,000 rows · Files never leave this page"}
          </EmptyDescription>
        </EmptyHeader>
        {!isPending && (
          <EmptyContent>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                onClick={() => {
                  inputRef.current?.click();
                }}
                variant="outline"
                disabled={isPending}
              >
                <FolderOpenIcon className="mr-2 size-4" />
                Browse files
              </Button>
              <Button
                onClick={() => {
                  toastManager.add({
                    title: "Paste a file",
                    description: "Copy a file, then press Ctrl+V (⌘V) anywhere on this page.",
                    type: "info",
                  });
                }}
                variant="ghost"
                disabled={isPending}
              >
                <ClipboardPasteIcon className="mr-2 size-4" />
                Paste from clipboard
              </Button>
            </div>
            <p className="mt-4 text-muted-foreground text-sm">
              No files handy? Try a sample:{' '}
              {SAMPLES.map((sample, index) => (
                <span key={sample.name}>
                  <button
                    className="cursor-pointer text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
                    onClick={() => handleFiles([sample.file()])}
                    type="button"
                    disabled={isPending}
                  >
                    {sample.label}
                  </button>
                  {index < SAMPLES.length - 1 ? " · " : ""}
                </span>
              ))}
            </p>
          </EmptyContent>
        )}
      </Empty>
    </div>
  );
};

export { FileDropzone as UploadDropzone };