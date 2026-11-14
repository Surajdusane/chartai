import "server-only";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const getChatModel = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const modelId = process.env.OPENROUTER_MODEL;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set.");
  }
  if (!modelId) {
    throw new Error(
      "OPENROUTER_MODEL is not set. Use a model that supports tool calling, e.g. openai/gpt-4.1-mini.",
    );
  }

  const openrouter = createOpenRouter({ apiKey });
  return openrouter.chat(modelId);
};
