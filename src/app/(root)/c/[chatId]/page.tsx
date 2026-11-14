import { prefetchChat } from "@/features/chats/server/prefetch-chats";
import { HydrateClient } from "@/trpc/server";

import { ChatView } from "./_components/chat-view";

const page = async ({ params }: PageProps<"/c/[chatId]">) => {
  const { chatId } = await params;
  prefetchChat(chatId);

  return (
    <HydrateClient>
      <ChatView chatId={chatId} />
    </HydrateClient>
  );
};

export default page;