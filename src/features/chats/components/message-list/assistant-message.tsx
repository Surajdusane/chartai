"use client";

import { getToolName, isReasoningUIPart, isTextUIPart, isToolUIPart, type UIMessage } from "ai";
import { Streamdown } from "streamdown";

import { ReasoningPart } from "./reasoning-part";
import { ToolPart } from "./tool-part";

export function AssistantMessage({ message, isStreaming }: { message: UIMessage; isStreaming: boolean }) {
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