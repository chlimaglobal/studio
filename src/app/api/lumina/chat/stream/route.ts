
import { ai } from '@/ai/genkit';
import { luminaChatFlow } from '@/ai/flows/lumina-chat';
import { NextRequest } from 'next/server';
import { StreamData, StreamingTextResponse } from 'ai';
import { z } from 'zod';

const LuminaChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        id: z.string().optional(),
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional(),
  userQuery: z.string().optional(),
  allTransactions: z.array(z.any()).optional(),
  imageBase64: z.string().optional().nullable(),
  audioText: z.string().optional(),
  isCoupleMode: z.boolean().optional(),
  isTTSActive: z.boolean().optional(),
  user: z
    .object({
      uid: z.string(),
      displayName: z.string().nullable(),
      email: z.string().nullable(),
      photoURL: z.string().nullable(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const rawInput = await request.json();
    const input = LuminaChatRequestSchema.parse(rawInput);
    
    // The user query for the flow is the last message content.
    const userQuery = input.messages?.[input.messages.length - 1]?.content || '';

    const { stream, response } = await luminaChatFlow(
      { ...input, userQuery },
      { stream: true }
    );

    const aiStream = stream.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          if (chunk.output?.text) {
            controller.enqueue(chunk.output.text);
          }
        },
      })
    );

    const data = new StreamData();
    response
      .then((finalResponse) => {
        data.append({
          finalSuggestions: finalResponse?.output?.suggestions || [],
        });
        data.close();
      })
      .catch((err) => {
        console.error('[LUMINA_STREAM_RESPONSE_ERROR]', err);
        data.append({ error: 'Erro ao finalizar a resposta.' });
        data.close();
      });

    return new StreamingTextResponse(aiStream, {}, data);
  } catch (error) {
    console.error('[LUMINA_API_ROUTE_ERROR]', error);
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Input inválido', details: error.errors }),
        { status: 400 }
      );
    }
    return new Response(
      JSON.stringify({
        error: 'Erro interno do servidor. Verifique os logs.',
      }),
      { status: 500 }
    );
  }
}
