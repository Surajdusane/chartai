"use client";

import { useState } from "react";
import { ChevronRightIcon } from "lucide-react";
import { Streamdown } from "streamdown";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function ReasoningPart({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="group text-muted-foreground flex items-center gap-1.5 text-xs font-medium outline-none">
        <ChevronRightIcon className="size-3.5 transition-transform group-aria-expanded:rotate-90" />
        Thinking
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Streamdown className="text-muted-foreground mt-2 text-sm">{text}</Streamdown>
      </CollapsibleContent>
    </Collapsible>
  );
}