import { UploadDropzone } from "@/features/datasets";

const page = () => {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
      <div className="flex max-w-xl flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Analyze a spreadsheet with AI</h1>
        <p className="text-muted-foreground text-sm">
          Upload a CSV or Excel file to start a new chat. Every chat keeps its own dataset.
        </p>
      </div>
      <UploadDropzone />
    </main>
  );
};

export default page;