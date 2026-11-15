"use client";

import { Button } from "@/components/ui/button";
import type { ColumnProfile } from "@/db/schema";

export function ChatEmptyState({
  onPick,
  columns,
  suggestedQuestions,
}: {
  onPick: (prompt: string) => void;
  columns: ColumnProfile[];
  suggestedQuestions?: string[];
}) {
  const numeric = columns.find((column) => column.type === "number");
  const stringColumn = columns.find((column) => column.type === "string");

  const prompts: string[] =
    suggestedQuestions && suggestedQuestions.length > 0
      ? suggestedQuestions
      : (() => {
          const fallback = ["Summarize this dataset"];
          if (numeric) {
            fallback.push(`Show the top 10 rows by ${numeric.name}`);
            if (stringColumn) fallback.push(`Chart ${numeric.name} by ${stringColumn.name}`);
            fallback.push(`What are the totals for ${numeric.name}?`);
          }
          return fallback;
        })();

  return (
    <div className="flex max-w-xl flex-col items-center gap-4 text-center">
      <h2 className="text-lg font-medium">What do you want to know?</h2>
      {suggestedQuestions && suggestedQuestions.length > 0 ? (
        <p className="text-muted-foreground text-sm">
          Try these questions to explore charts and insights from this sample dataset.
        </p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-2">
        {prompts.map((prompt) => (
          <Button
            key={prompt}
            variant="ghost"
            size="sm"
            className="h-auto whitespace-normal py-2 text-left"
            onClick={() => onPick(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}