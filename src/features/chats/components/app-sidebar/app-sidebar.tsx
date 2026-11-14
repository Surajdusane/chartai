"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusIcon } from "lucide-react";

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