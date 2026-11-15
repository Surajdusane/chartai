import { SidebarTrigger } from "@/components/ui/sidebar";
import { UploadDropzone } from "@/features/datasets";
import { Logo } from "@/features/chats/components/app-sidebar/logo";

const page = () => {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SidebarTrigger className="md:hidden" />
      <main className="flex min-h-0 flex-1 items-center justify-center p-6 md:p-8">
        <div className="w-full max-w-3xl gap-y-16 flex flex-col">
          <header className="flex h-16 shrink-0 items-center gap-4 px-4 md:px-6">
            <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-center">
              <Logo size={56} className="mb-2 rounded-2xl" />
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Analyze spreadsheets with AI
              </h1>
              <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
                Upload a CSV or Excel file to start a new chat. Every chat keeps
                its own dataset.
              </p>
            </div>
          </header>
          <UploadDropzone />
        </div>
      </main>
    </div>
  );
};

export default page;
