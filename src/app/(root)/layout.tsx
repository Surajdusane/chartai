import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";

import "@/styles/globals.css";

import { Suspense } from "react";

import { ConfirmationDialog } from "@/hooks/use-confirm";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { AppSidebar } from "@/features/chats/components/app-sidebar";
import { prefetchChats } from "@/features/chats/server/prefetch-chats";
import { HydrateClient } from "@/trpc/server";
import { cn } from "@/lib/utils";
import { Providers } from "@/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const interHeading = Inter({ subsets: ["latin"], variable: "--font-heading" });
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Chart AI",
  description: "Chat with your spreadsheet",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  prefetchChats();

  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased",
        geistSans.variable,
        geistMono.variable,
        inter.variable,
        interHeading.variable,
        "font-sans",
      )}
      suppressHydrationWarning
    >
      <body className="h-full">
        <Providers>
          <HydrateClient>
            <SidebarProvider className="h-dvh overflow-hidden">
              <Suspense fallback={<SidebarFallback />}>
                <AppSidebar />
              </Suspense>
              <SidebarInset className="min-h-0 min-w-0 overflow-hidden">{children}</SidebarInset>
              <ConfirmationDialog />
            </SidebarProvider>
          </HydrateClient>
        </Providers>
      </body>
    </html>
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