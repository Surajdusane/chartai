# 04 — App shell and sidebar

**Read `AGENTS.md` at the repository root first and strictly follow it.**

> Step 4 of 9. Step 03 is complete: upload works and redirects to `/c/<chatId>`. The chat page is still a placeholder.

## Goal

A persistent ChatGPT-style shell: collapsible sidebar on the left with chat history grouped by date, `New chat` action, per-chat rename/delete, theme toggle, and a content area that fills the viewport without double scrollbars. Mobile uses the existing sidebar sheet.

## Do not

- Do not build the chat message list or composer (step 05).
- Do not add charts or AI.
- Do not replace the installed `Sidebar*` primitives with custom markup.

## Tasks

### 1. Date grouping utility

Create `src/features/chats/utils/group-chats-by-date.ts`:

```ts
import type { ChatListItem } from "@/features/chats/types";

export type ChatGroup = {
  label: "Today" | "Yesterday" | "Previous 7 days" | "Older";
  chats: ChatListItem[];
};

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
};

export const groupChatsByDate = (chats: ChatListItem[], now = new Date()): ChatGroup[] => {
  const today = startOfDay(now);
  const yesterday = today - 24 * 60 * 60 * 1000;
  const weekAgo = today - 7 * 24 * 60 * 60 * 1000;

  const groups: ChatGroup[] = [
    { label: "Today", chats: [] },
    { label: "Yesterday", chats: [] },
    { label: "Previous 7 days", chats: [] },
    { label: "Older", chats: [] },
  ];

  for (const chat of chats) {
    const created = startOfDay(new Date(chat.updatedAt));
    const index = created >= today ? 0 : created >= yesterday ? 1 : created >= weekAgo ? 2 : 3;
    groups[index].chats.push(chat);
  }

  return groups.filter((group) => group.chats.length > 0);
};
```

Export it from `src/features/chats/index.ts`.

### 2. Layout shell

Replace `src/app/(root)/layout.tsx`'s body. Keep the existing fonts/metadata unless the user asked otherwise (update `metadata.title` to `"Chart AI"` and `description` to `"Chat with your spreadsheet"`).

```tsx
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
```

Notes:

- The existing layout already imports `Providers` and fonts — keep the same provider tree, just move it inside `<body>`.
- Do not put `<SidebarTrigger />` in the layout. Each page owns its header so the trigger sits next to the page title.
- `prefetchChats()` runs in the layout so the sidebar hydrates instantly on every route.

### 3. Sidebar components

Create `src/features/chats/components/app-sidebar/index.tsx`, `app-sidebar.tsx`, `chat-list.tsx`, `chat-item.tsx`, `rename-chat-dialog.tsx`, and `theme-toggle.tsx`. Export only the public `AppSidebar` from `index.ts`.

`app-sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useGetChats } from "@/features/chats/hooks";
import { groupChatsByDate } from "@/features/chats/utils/group-chats-by-date";

import { ChatList } from "./chat-list";
import { ThemeToggle } from "./theme-toggle";

export function AppSidebar() {
  const pathname = usePathname();
  const { data: chats } = useGetChats();
  const groups = groupChatsByDate(chats);

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />} tooltip="Chart AI">
              <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg text-sm font-semibold">
                C
              </div>
              <span className="truncate font-semibold">Chart AI</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton isActive={pathname === "/"} render={<Link href="/" />} tooltip="New chat">
              <PlusIcon />
              <span>New chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <ChatList groups={groups} activeChatId={pathname.startsWith("/c/") ? pathname.split("/")[2] : undefined} />
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
          <span className="text-muted-foreground truncate text-xs group-data-[collapsible=icon]:hidden">
            {chats.length} {chats.length === 1 ? "chat" : "chats"}
          </span>
          <ThemeToggle />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
```

Notes:

- `SidebarMenuButton` accepts `render={<Link />}` (Base UI `useRender`). Use it instead of nesting an `<a>` inside a `<button>`.
- `variant="icon"` collapse works because every `SidebarMenuButton` gets a `tooltip`.

`chat-list.tsx` renders one `SidebarGroup` per non-empty group:

```tsx
"use client";

import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu } from "@/components/ui/sidebar";
import type { ChatGroup } from "@/features/chats/utils/group-chats-by-date";

import { ChatItem } from "./chat-item";

export function ChatList(props: { groups: ChatGroup[]; activeChatId?: string }) {
  if (props.groups.length === 0) {
    return (
      <p className="text-muted-foreground px-3 py-6 text-xs group-data-[collapsible=icon]:hidden">
        No chats yet. Upload a file to start one.
      </p>
    );
  }

  return (
    <>
      {props.groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.chats.map((chat) => (
                <ChatItem key={chat.id} chat={chat} isActive={chat.id === props.activeChatId} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
```

`chat-item.tsx`:

- `SidebarMenuItem` containing `SidebarMenuButton` (`isActive`, `render={<Link href={`/c/${chat.id}`} />}`, `tooltip={chat.title}`).
- Title text must truncate. Add a second line with `chat.dataset.name` only when the sidebar is expanded.
- A `Menu` with `MenuTrigger render={<SidebarMenuAction showOnHover />}` and `MenuPopup` containing `MenuItem` "Rename" and `MenuItem variant="destructive"` "Delete".
- Rename opens `RenameChatDialog` controlled from local state.
- Delete:

```tsx
const handleDelete = async () => {
  const confirmed = await confirm({
    title: "Delete this chat?",
    description: `“${chat.title}” and its dataset will be permanently deleted.`,
    confirmText: "Delete",
  });
  if (!confirmed) return;
  deleteChat.mutate({ id: chat.id });
};
```

`RenameChatDialog`:

- `Dialog open onOpenChange`, `DialogPopup`, `DialogHeader`, `DialogTitle`, `DialogDescription`.
- Local `title` state, seeded from `chat.title` whenever the dialog opens.
- `Input` with `maxLength={80}`, `DialogFooter` with `DialogClose render={<Button variant="outline" />}` and a `Button` that calls `renameChat.mutateAsync({ id, title.trim() })`, then closes. Disable when empty or pending.
- Never use `window.prompt`.

`ThemeToggle`:

```tsx
"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <Menu>
      <MenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label="Change theme" />}>
        <SunIcon className="dark:hidden" />
        <MoonIcon className="hidden dark:block" />
      </MenuTrigger>
      <MenuPopup align="end">
        <MenuItem onClick={() => setTheme("light")}><SunIcon /> Light</MenuItem>
        <MenuItem onClick={() => setTheme("dark")}><MoonIcon /> Dark</MenuItem>
        <MenuItem onClick={() => setTheme("system")}><MonitorIcon /> System</MenuItem>
      </MenuPopup>
    </Menu>
  );
}
```

Do not render the icon based on `useTheme().theme` during SSR; the CSS `dark:` swap above avoids hydration mismatches.

### 4. Page headers

Add `SidebarTrigger` to the top-left of both pages so mobile can open the sidebar.

- `src/app/(root)/page.tsx`: change `min-h-dvh` to `min-h-0 flex-1` (the inset already fills the viewport). Add a header row with `<SidebarTrigger className="md:hidden" />` above the centered content.
- `src/app/(root)/c/[chatId]/page.tsx`: replace the placeholder body with:

```tsx
import { SidebarTrigger } from "@/components/ui/sidebar";

const page = async ({ params }: PageProps<"/c/[chatId]">) => {
  const { chatId } = await params;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
        <SidebarTrigger />
        <span className="truncate text-sm font-medium">Chat</span>
        <span className="text-muted-foreground ml-auto text-xs">{chatId.slice(0, 8)}</span>
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground text-sm">The chat UI arrives in step 05.</p>
      </div>
    </div>
  );
};

export default page;
```

### 5. Scroll and sizing rules

- The shell is fixed-height: `SidebarProvider` has `h-dvh overflow-hidden`, `SidebarInset` has `min-h-0 overflow-hidden`.
- Only the message list (step 05) scrolls, never the document. If two scrollbars appear, fix the page containers rather than adding `overflow-hidden` to `<body>`.
- The sidebar must never push the content wider than the viewport: keep `min-w-0` on the inset.

## Acceptance criteria

- [ ] Sidebar lists chats grouped Today / Yesterday / Previous 7 days / Older, newest first.
- [ ] Clicking a chat navigates to `/c/<chatId>` and highlights it in the sidebar.
- [ ] `New chat` goes to `/` where the upload dropzone is.
- [ ] Rename works from the chat menu, updates the sidebar and the chat page header after invalidation, and shows toasts.
- [ ] Delete asks for confirmation, removes the chat, and navigates to `/` when the active chat was deleted.
- [ ] Sidebar collapses to icons on desktop (`⌘/Ctrl+B` also works) and becomes a sheet under `md`.
- [ ] Theme toggle switches light/dark/system without a hydration warning.
- [ ] No double scrollbar at 1440×900, 1024×768, or 390×844.
- [ ] `bun run lint` and `bun run build` pass.

When done, report a screenshot description of the sidebar at desktop and mobile widths, and the list of files created.
