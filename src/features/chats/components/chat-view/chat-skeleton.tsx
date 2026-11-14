import { Skeleton } from "@/components/ui/skeleton";

export function ChatSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
        <Skeleton className="size-8" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
        <Skeleton className="ml-auto h-16 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="ml-auto h-16 w-2/3" />
      </div>
    </div>
  );
}