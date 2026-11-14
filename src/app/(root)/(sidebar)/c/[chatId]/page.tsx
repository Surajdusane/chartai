import { prefetchChat } from "@/features/chats/server/prefetch-chats";
import { ChatView } from "@/features/chats/components/chat-view";
import { HydrateClient } from "@/trpc/server";

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