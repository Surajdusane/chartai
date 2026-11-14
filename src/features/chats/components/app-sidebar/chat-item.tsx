"use client";

import { useState } from "react";
import Link from "next/link";

import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useDeleteChat } from "@/features/chats/hooks/use-delete-chat";
import type { ChatListItem } from "@/features/chats/types";
import { confirm } from "@/hooks/use-confirm";

import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { RenameChatDialog } from "./rename-chat-dialog";

interface ChatItemProps {
  chat: ChatListItem;
  isActive?: boolean;
}

export function ChatItem({ chat, isActive }: ChatItemProps) {
  const deleteChat = useDeleteChat(chat.id);
  const [isRenameOpen, setIsRenameOpen] = useState(false);

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Delete this chat?",
      description: `“${chat.title}” and its dataset will be permanently deleted.`,
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;
    deleteChat.mutate({ id: chat.id });
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        render={<Link href={`/c/${chat.id}`} />}
        tooltip={chat.title}
      >
        <span className="truncate">{chat.title}</span>
        <span className="text-muted-foreground text-xs group-data-[collapsible=icon]:hidden">
          {chat.dataset?.name ?? "Unknown dataset"}
        </span>
      </SidebarMenuButton>
      <Menu>
        <MenuTrigger render={<SidebarMenuAction showOnHover />}>
          <MoreHorizontalIcon />
        </MenuTrigger>
        <MenuPopup align="end">
          <MenuItem
            onClick={() => {
              setIsRenameOpen(true);
            }}
          >
            <PencilIcon /> Rename
          </MenuItem>
          <MenuItem variant="destructive" onClick={handleDelete}>
            <Trash2Icon /> Delete
          </MenuItem>
        </MenuPopup>
      </Menu>
      <RenameChatDialog chat={chat} open={isRenameOpen} onOpenChange={setIsRenameOpen} />
    </SidebarMenuItem>
  );
}