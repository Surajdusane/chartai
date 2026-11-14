"use client";

import { useState } from "react";
import { ArrowUpIcon, SquareIcon } from "lucide-react";

import {
  Composer,
  ComposerActionGroup,
  ComposerActions,
  ComposerInput,
  ComposerSubmit,
  getComposerText,
  type ComposerValue,
} from "@/components/ui/composer";
import { Button } from "@/components/ui/button";

export function ChatComposer(props: {
  onSend: (text: string) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState<ComposerValue>([]);

  const submit = (next: ComposerValue) => {
    const text = getComposerText(next).trim();
    if (!text || props.disabled) return;
    props.onSend(text);
    setValue([]);
  };

  return (
    <Composer
      value={value}
      onValueChange={setValue}
      onSubmit={submit}
      submitDisabled={props.disabled}
      className="bg-background"
    >
      <ComposerInput placeholder={props.placeholder ?? "Ask about your data…"} />
      <ComposerActions>
        <ComposerActionGroup />
        <ComposerActionGroup align="end">
          {props.isStreaming ? (
            <Button size="icon-sm" variant="secondary" onClick={props.onStop} aria-label="Stop generating">
              <SquareIcon />
            </Button>
          ) : (
            <ComposerSubmit aria-label="Send message">
              <ArrowUpIcon />
            </ComposerSubmit>
          )}
        </ComposerActionGroup>
      </ComposerActions>
    </Composer>
  );
}