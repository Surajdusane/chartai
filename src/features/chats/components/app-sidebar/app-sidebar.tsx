"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useGetChats } from "@/features/chats/hooks";
import { groupChatsByDate } from "@/features/chats/utils/group-chats-by-date";

import { ChatList } from "./chat-list";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

export function AppSidebar() {
  const pathname = usePathname();
  const { data: chats } = useGetChats();
  const groups = groupChatsByDate(chats);

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <div className="flex items-center justify-between gap-1">
          <SidebarMenuButton
            size="lg"
            render={<Link href="/" />}
            tooltip="Chart AI"
            className="group-data-[collapsible=icon]:hidden"
          >
            <Logo />
            <span className="truncate font-semibold tracking-tight">Chart AI</span>
          </SidebarMenuButton>
          <SidebarTrigger className="size-7" />
        </div>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname === "/"}
            render={<Link href="/" />}
            tooltip="New chat"
            variant="outline"
            className="group-data-[collapsible=icon]:hidden"
          >
            <PlusIcon />
            <span>New chat</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarHeader>

      <SidebarSeparator className="mx-0 group-data-[collapsible=icon]:hidden" />

      <SidebarContent>
        <div className="group-data-[collapsible=icon]:hidden">
          <ChatList groups={groups} activeChatId={pathname.startsWith("/c/") ? pathname.split("/")[2] : undefined} />
        </div>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
          <span className="text-muted-foreground truncate text-xs group-data-[collapsible=icon]:hidden">
            {chats.length} {chats.length === 1 ? "chat" : "chats"}
          </span>
          <div className="group-data-[collapsible=icon]:hidden">
            <ThemeToggle />
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}