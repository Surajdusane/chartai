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