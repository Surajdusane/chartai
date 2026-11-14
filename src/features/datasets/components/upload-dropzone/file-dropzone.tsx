"use client";

import { useRef, useState } from "react";
import { UploadCloudIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toastManager } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useCreateDataset } from "@/features/datasets/hooks/use-create-dataset";

export const FileDropzone = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isActive, setIsActive] = useState(false);
  const { uploadFile, isPending } = useCreateDataset();

  const openPicker = () => {
    if (isPending) return;
    inputRef.current?.click();
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (files.length > 1) {
      toastManager.add({
        title: "Multiple files",
        description: "Only the first file will be used.",
        type: "info",
      });
    }
    void uploadFile(files[0]);
  };

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (isPending) return;
    setIsActive(true);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isPending) return;
    setIsActive(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    setIsActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isPending) return;
    setIsActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  };

  return (
    <Card
      role="button"
      tabIndex={isPending ? -1 : 0}
      aria-disabled={isPending}
      onClick={openPicker}
      onKeyDown={onKeyDown}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "w-full max-w-xl cursor-pointer border-dashed bg-muted/40 p-10 text-center transition-colors",
        "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive && "border-primary bg-muted/60",
        isPending && "pointer-events-none opacity-70",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx"
        className="hidden"
        disabled={isPending}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="flex flex-col items-center gap-3">
        {isPending ? (
          <>
            <Spinner className="size-6" />
            <p className="text-sm font-medium">Parsing your dataset…</p>
          </>
        ) : (
          <>
            <div className="flex size-12 items-center justify-center rounded-full bg-background shadow-sm">
              <UploadCloudIcon className="text-muted-foreground size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Drop a spreadsheet here, or click to browse</p>
              <p className="text-muted-foreground text-xs">CSV or XLSX · up to 5 MB · max 20,000 rows</p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};
