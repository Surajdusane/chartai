import { SidebarTrigger } from "@/components/ui/sidebar";
import { UploadDropzone } from "@/features/datasets";

const page = () => {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
        <SidebarTrigger className="md:hidden" />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Analyze a spreadsheet with AI</h1>
          <p className="text-muted-foreground text-sm">
            Upload a CSV or Excel file to start a new chat. Every chat keeps its own dataset.
          </p>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 items-center justify-center p-6">
        <UploadDropzone />
      </main>
    </div>
  );
};

export default page;