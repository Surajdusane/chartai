"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRenameChat } from "@/features/chats/hooks/use-rename-chat";
import type { ChatListItem } from "@/features/chats/types";

interface RenameChatDialogProps {
  chat: ChatListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RenameChatDialog({ chat, open, onOpenChange }: RenameChatDialogProps) {
  const renameChat = useRenameChat();
  const [title, setTitle] = useState(() => chat.title);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || trimmed === chat.title) {
      onOpenChange(false);
      return;
    }
    setIsPending(true);
    try {
      await renameChat.mutateAsync({ id: chat.id, title: trimmed });
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    } finally {
      setIsPending(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTitle(chat.title);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPopup>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
            <DialogDescription>Enter a new name for this chat.</DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              autoFocus
              placeholder="Chat name"
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />} onClick={() => handleOpenChange(false)}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={!title.trim() || isPending} loading={isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}