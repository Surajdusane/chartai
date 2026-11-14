import type { UIMessage } from "ai";

import type { ChatDetail } from "@/features/chats/types";

export const toUiMessages = (chat: { messages: ChatDetail["messages"] }): UIMessage[] =>
  chat.messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: message.parts,
  }));