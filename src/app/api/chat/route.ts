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
import { after } from "next/server";

import { getDb } from "@/db";
import { getChatMessages, getChatWithDataset, renameChat, saveChatMessages } from "@/db/queries";
import { getChatModel } from "@/features/assistant/server/model";
import { buildSystemPrompt } from "@/features/assistant/server/system-prompt";
import { createChatTools } from "@/features/assistant/server/tools";
import { generateChatTitle } from "@/features/chats/server/generate-title";
import { createDatasetTitle } from "@/features/datasets/utils/create-dataset-title";

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

  const dataset = chat.dataset;
  const tools = createChatTools({ columns: dataset.columns, rows: dataset.rows });

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
    system: buildSystemPrompt(dataset),
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
      onEnd: async ({ messages: finalMessages, isCancelled }) => {
        // Persist partial answers too: `stop()` closes the client stream, which
        // cancels the response and lands here without a `finish` chunk.
        const persistable = finalMessages.filter(
          (message) => message.role !== "assistant" || message.parts.length > 1,
        );

        try {
          await saveChatMessages(db, { chatId: chat.id, messages: persistable });
        } catch (error) {
          console.error("[chat] could not persist messages", error);
          return;
        }

        // A stopped answer is saved, but it should not become the chat's title.
        if (isCancelled) return;

        // Only rename chats that still carry the name derived from the uploaded file.
        const isAutoTitle = chat.title === createDatasetTitle(dataset.name);
        const isFirstAnswer = persistable.filter((message) => message.role === "user").length <= 1;

        if (!isAutoTitle || !isFirstAnswer) return;

        // `after` runs once the response is already with the client, so a slow
        // title call never keeps the stream in `streaming` any longer. When the
        // environment has no `after`, the chat simply keeps its file-derived title.
        const titleTask = async () => {
          try {
            const title = await generateChatTitle(persistable);
            if (title) {
              await renameChat(db, { id: chat.id, title });
            }
          } catch (error) {
            console.error("[chat] could not generate a title", error);
          }
        };

        try {
          after(titleTask);
        } catch (error) {
          console.error("[chat] could not schedule a title", error);
        }
      },
    }),
  });
}
