import { isTextUIPart, type UIMessage } from "ai";

export const getMessageText = (message: UIMessage, separator = "\n") =>
  message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join(separator)
    .trim();