import "server-only";

import { generateText, isTextUIPart, type UIMessage } from "ai";

import { getChatModel } from "@/features/assistant/server/model";

const MAX_TITLE_LENGTH = 60;
const TITLE_TIMEOUT_MS = 2_000;

const textOf = (message: UIMessage) =>
  message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

const cleanTitle = (value: string) =>
  value
    .replace(/^["'`#*\s]+|["'`#*\s]+$/g, "")
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .slice(0, MAX_TITLE_LENGTH)
    .trim();

export const generateChatTitle = async (messages: UIMessage[]): Promise<string | null> => {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser) return null;

  const firstAnswer = messages.find((message) => message.role === "assistant");
  const prompt = [
    `User: ${textOf(firstUser).slice(0, 500)}`,
    firstAnswer ? `Assistant: ${textOf(firstAnswer).slice(0, 500)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), TITLE_TIMEOUT_MS);
  });

  const generation = generateText({
    model: getChatModel(),
    system:
      "Write a title for this data chat. 3 to 6 words, sentence case, no quotes, no trailing punctuation, no emoji. Reply with the title only.",
    prompt,
    maxOutputTokens: 24,
    temperature: 0.2,
  }).then((result) => cleanTitle(result.text) || null);

  return Promise.race([generation, timeout]).catch(() => null);
};