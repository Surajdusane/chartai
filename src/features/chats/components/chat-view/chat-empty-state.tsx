"use client";

import { Button } from "@/components/ui/button";
import type { ColumnProfile } from "@/db/schema";

export function ChatEmptyState({
  onPick,
  columns,
}: {
  onPick: (prompt: string) => void;
  columns: ColumnProfile[];
}) {
  const numeric = columns.find((column) => column.type === "number");
  const stringColumn = columns.find((column) => column.type === "string");

  const prompts: string[] = ["Summarize this dataset"];
  if (numeric) {
    prompts.push(`Show the top 10 rows by ${numeric.name}`);
    if (stringColumn) prompts.push(`Chart ${numeric.name} by ${stringColumn.name}`);
    prompts.push(`What are the totals for ${numeric.name}?`);
  }

  return (
    <div className="flex max-w-xl flex-col items-center gap-4 text-center">
      <h2 className="text-lg font-medium">What do you want to know?</h2>
      <div className="flex flex-wrap justify-center gap-2">
        {prompts.map((prompt) => (
          <Button key={prompt} variant="outline" size="sm" onClick={() => onPick(prompt)}>
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}