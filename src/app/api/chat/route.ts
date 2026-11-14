import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  generateId,
  isStepCount,
  streamText,
  toUIMessageStream,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { getDb } from "@/db";
import { getChatMessages, getChatWithDataset, saveChatMessages } from "@/db/queries";
import { getChatModel } from "@/features/assistant/server/model";
import { buildSystemPrompt } from "@/features/assistant/server/system-prompt";
import { createChatTools } from "@/features/assistant/server/tools";

export const maxDuration = 60;

const chatRequestSchema = z.object({
  chatId: z.string().min(1),
  message: z.object({
    id: z.string().min(1),
    role: z.literal("user"),
    parts: z.array(z.unknown()).min(1),
  }),
  trigger: z.enum(["submit-message", "regenerate-message"]).default("submit-message"),
});

const dropTrailingAssistant = (messages: UIMessage[]) => {
  const next = [...messages];
  while (next.length > 0 && next[next.length - 1].role === "assistant") {
    next.pop();
  }
  return next;
};

export async function POST(request: Request) {
  let body: z.infer<typeof chatRequestSchema>;
  try {
    body = chatRequestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!process.env.GROQ_API_KEY || !(process.env.GROQ_MODEL ?? process.env.GROQ_MODLE)) {
    return Response.json(
      { error: "The assistant is not configured. Set GROQ_API_KEY and GROQ_MODEL." },
      { status: 500 },
    );
  }

  const db = getDb();
  const chat = await getChatWithDataset(db, body.chatId);
  if (!chat?.dataset) {
    return Response.json({ error: "Chat not found." }, { status: 404 });
  }

  const tools = createChatTools({ columns: chat.dataset.columns, rows: chat.dataset.rows });

  let incoming: UIMessage[];
  try {
    incoming = await validateUIMessages({ messages: [body.message], tools });
  } catch {
    return Response.json({ error: "That message could not be validated." }, { status: 400 });
  }

  const stored = await getChatMessages(db, chat.id);
  const base = body.trigger === "regenerate-message" ? dropTrailingAssistant(stored) : stored;
  const history = base.filter((message) => message.id !== incoming[0].id);
  const messages = [...history, incoming[0]];

  const result = streamText({
    model: getChatModel(),
    system: buildSystemPrompt(chat.dataset),
    messages: await convertToModelMessages(messages, {
      tools,
      ignoreIncompleteToolCalls: true,
    }),
    tools,
    stopWhen: isStepCount(5),
    abortSignal: request.signal,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      tools,
      originalMessages: messages,
      generateMessageId: generateId,
      sendReasoning: false,
      onError: (error) => {
        console.error("[chat] stream error", error);
        return "The assistant hit an error while answering. Try again.";
      },
      onEnd: async ({ messages: finalMessages }) => {
        // Persist partial answers too: `stop()` closes the client stream, which
        // cancels the response and lands here without a `finish` chunk.
        const persistable = finalMessages.filter(
          (message) => message.role !== "assistant" || message.parts.length > 1,
        );

        try {
          await saveChatMessages(db, { chatId: chat.id, messages: persistable });
        } catch (error) {
          console.error("[chat] could not persist messages", error);
        }
      },
    }),
  });
}
