"use client";

import type { ColumnProfile } from "@/db/schema";
import { Button } from "@/components/ui/button";

const find = (columns: ColumnProfile[], type: ColumnProfile["type"]) =>
  columns.find((column) => column.type === type)?.name;

export function FollowUpChips(props: {
  columns: ColumnProfile[];
  onPick: (prompt: string) => void;
  disabled?: boolean;
}) {
  const numeric = find(props.columns, "number");
  const category = find(props.columns, "string");
  const date = find(props.columns, "date");

  const prompts = [
    numeric && category ? `Break down ${numeric} by ${category}` : null,
    numeric && date ? `Show the trend of ${numeric} over ${date}` : null,
    numeric ? `Top 10 rows by ${numeric}` : null,
    `What stands out in this dataset?`,
  ].filter((prompt): prompt is string => Boolean(prompt));

  return (
    <div className="flex flex-wrap gap-2">
      {prompts.slice(0, 3).map((prompt, index) => (
        <Button
          key={prompt}
          size="sm"
          variant="outline"
          disabled={props.disabled}
          className={index === 2 ? "hidden sm:inline-flex" : undefined}
          onClick={() => props.onPick(prompt)}
        >
          {prompt}
        </Button>
      ))}
    </div>
  );
}