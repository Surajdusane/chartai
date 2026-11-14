"use client";

import { AlertTriangleIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

export function ChartSkeleton() {
  return (
    <div className="bg-card flex h-[320px] w-full flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-1">
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      </div>
      <div className="flex flex-1 items-end gap-2 pt-2">
        <Skeleton className="h-[40%] flex-1 rounded-sm" />
        <Skeleton className="h-[70%] flex-1 rounded-sm" />
        <Skeleton className="h-[55%] flex-1 rounded-sm" />
        <Skeleton className="h-[85%] flex-1 rounded-sm" />
        <Skeleton className="h-[45%] flex-1 rounded-sm" />
        <Skeleton className="h-[60%] flex-1 rounded-sm" />
        <Skeleton className="h-[75%] flex-1 rounded-sm" />
        <Skeleton className="h-[50%] flex-1 rounded-sm" />
      </div>
      <Skeleton className="h-3 w-32 self-center" />
    </div>
  );
}

export function ChartErrorCard({
  title = "Could not draw this chart",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div
      role="alert"
      className="border-destructive/30 bg-destructive/5 flex w-full flex-col gap-2 rounded-xl border p-4"
    >
      <p className="text-destructive flex items-center gap-1.5 text-sm font-medium">
        <AlertTriangleIcon className="size-4" />
        {title}
      </p>
      <p className="text-muted-foreground text-sm">{message}</p>
      <p className="text-muted-foreground/80 text-xs">
        Ask again with a supported column.
      </p>
    </div>
  );
}
