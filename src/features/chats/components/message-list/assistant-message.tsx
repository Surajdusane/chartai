"use client";

import { getToolName, isReasoningUIPart, isTextUIPart, isToolUIPart, type UIMessage } from "ai";
import { Streamdown } from "streamdown";

import { ReasoningPart } from "./reasoning-part";
import { ToolPart } from "./tool-part";

export function AssistantMessage({ message, isStreaming }: { message: UIMessage; isStreaming: boolean }) {
  const textParts = message.parts.filter(isTextUIPart);

  if (isStreaming && textParts.length === 0) {
    return (
      <div className="flex justify-start">
        <div className="bg-card border border-border rounded-2xl p-4 w-full max-w-[min(42rem,85%)]">
          <h4 className="shimmer text-muted-foreground font-medium text-sm">Generating response</h4>
          <p className="shimmer text-muted-foreground mt-2">Analyzing your data…</p>
          <p className="shimmer text-muted-foreground mt-1 w-3/4">Please wait…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {message.parts.map((part, index) => {
        if (isTextUIPart(part)) {
          return (
            <Streamdown
              key={index}
              mode={isStreaming ? "streaming" : "static"}
              className="prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            >
              {part.text}
            </Streamdown>
          );
        }

        if (isReasoningUIPart(part)) {
          return <ReasoningPart key={index} text={part.text} />;
        }

        if (isToolUIPart(part)) {
          return <ToolPart key={part.toolCallId} name={getToolName(part)} part={part} />;
        }

        if (part.type === "step-start") {
          return <div key={index} className="bg-border my-4 h-px w-full" />;
        }

        return null;
      })}
    </div>
  );
}
