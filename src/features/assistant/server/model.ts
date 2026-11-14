import "server-only";

import { createGroq } from "@ai-sdk/groq";

export const getChatModel = () => {
  const apiKey = process.env.GROQ_API_KEY;
  const modelId = process.env.GROQ_MODEL ?? process.env.GROQ_MODLE;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set.");
  }
  if (!modelId) {
    throw new Error(
      "GROQ_MODEL is not set. Use a Groq model that supports tool calling, e.g. llama-3.3-70b-versatile.",
    );
  }

  const groq = createGroq({ apiKey });
  return groq(modelId);
};
