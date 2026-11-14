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