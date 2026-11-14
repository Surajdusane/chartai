import { Suspense } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmationDialog } from "@/hooks/use-confirm";
import { AppSidebar } from "@/features/chats/components/app-sidebar";
import { prefetchChats } from "@/features/chats/server/prefetch-chats";
import { HydrateClient } from "@/trpc/server";

export default function SidebarLayout({ children }: LayoutProps<"/">) {
  prefetchChats();

  return (
    <HydrateClient>
      <SidebarProvider className="h-dvh overflow-hidden">
        <Suspense fallback={<SidebarFallback />}>
          <AppSidebar />
        </Suspense>
        <SidebarInset className="min-h-0 min-w-0 overflow-hidden">{children}</SidebarInset>
        <ConfirmationDialog />
      </SidebarProvider>
    </HydrateClient>
  );
}

function SidebarFallback() {
  return (
    <div className="bg-sidebar hidden w-64 shrink-0 flex-col gap-2 p-2 md:flex">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-7 w-5/6" />
      <Skeleton className="h-7 w-4/6" />
    </div>
  );
}