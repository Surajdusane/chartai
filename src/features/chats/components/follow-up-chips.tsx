"use client";

import type { ColumnProfile } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const find = (columns: ColumnProfile[], type: ColumnProfile["type"]) =>
  columns.find((column) => column.type === type)?.name;

export function FollowUpChips(props: {
  columns: ColumnProfile[];
  onPick: (prompt: string) => void;
  disabled?: boolean;
  prompts?: string[];
}) {
  const numeric = find(props.columns, "number");
  const category = find(props.columns, "string");
  const date = find(props.columns, "date");

  const prompts =
    props.prompts && props.prompts.length > 0
      ? props.prompts
      : [
          numeric && category ? `Break down ${numeric} by ${category}` : null,
          numeric && date ? `Show the trend of ${numeric} over ${date}` : null,
          numeric ? `Top 10 rows by ${numeric}` : null,
          `What stands out in this dataset?`,
        ].filter((prompt): prompt is string => Boolean(prompt));

  if (prompts.length === 0) return null;

  return (
    <div className="pt-2">
      <Separator className="mb-4" />
      <div className="flex flex-col items-start gap-1">
        <p className="text-muted-foreground mb-1 text-xs font-medium">Suggested questions</p>
        {prompts.map((prompt) => (
          <Button
            key={prompt}
            variant="ghost"
            size="sm"
            disabled={props.disabled}
            className="text-muted-foreground hover:text-foreground h-auto w-full justify-start whitespace-normal px-2 py-1.5 text-left text-sm"
            onClick={() => props.onPick(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}