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