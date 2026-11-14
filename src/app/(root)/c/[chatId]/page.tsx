import Link from "next/link";

const page = async ({ params }: PageProps<"/c/[chatId]">) => {
  const { chatId } = await params;

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Chat {chatId}</h1>
      <p className="text-muted-foreground text-sm">The chat UI arrives in step 05.</p>
      <Link className="text-sm underline underline-offset-4" href="/">
        Start another chat
      </Link>
    </main>
  );  
};

export default page;
