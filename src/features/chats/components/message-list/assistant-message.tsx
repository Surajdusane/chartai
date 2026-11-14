"use client";

import { getToolName, isReasoningUIPart, isTextUIPart, isToolUIPart, type UIMessage } from "ai";
import { Streamdown } from "streamdown";

import { MessageActions } from "./message-actions";
import { ReasoningPart } from "./reasoning-part";
import { ToolPart } from "./tool-part";

export function AssistantMessage({
  message,
  isStreaming,
  showActions = false,
  canRegenerate = false,
  onRegenerate,
  stopped = false,
}: {
  message: UIMessage;
  isStreaming: boolean;
  showActions?: boolean;
  canRegenerate?: boolean;
  onRegenerate?: () => void;
  stopped?: boolean;
}) {
  const hasText = message.parts.some((part) => isTextUIPart(part) && part.text.trim().length > 0);

  if (isStreaming && !hasText) {
    // The thinking row in `MessageList` covers this state.
    return null;
  }

  return (
    <div className="group min-w-0">
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

      {showActions && onRegenerate ? (
        <div className="mt-1.5 flex items-center gap-2">
          <MessageActions message={message} canRegenerate={canRegenerate} onRegenerate={onRegenerate} />
          {stopped ? <span className="text-muted-foreground text-xs">Stopped</span> : null}
        </div>
      ) : null}
    </div>
  );
}