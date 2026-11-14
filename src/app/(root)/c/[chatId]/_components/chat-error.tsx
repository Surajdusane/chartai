"use client";

import Link from "next/link";

export function ChatError({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "Something went wrong";

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-medium">Something went wrong</p>
      <p className="text-muted-foreground max-w-md text-sm">{message}</p>
      <Link href="/" className="text-muted-foreground hover:text-foreground text-sm underline">
        Back to home
      </Link>
    </div>
  );
}