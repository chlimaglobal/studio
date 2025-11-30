
// src/app/api/lumina/chat/stream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { generateSuggestion, luminaChatFlow } from '@/ai/flows/lumina-chat';
import { z } from 'zod';
import { StreamingTextResponse, streamToResponse } from 'ai';
import { render } from 'genkit/html';


export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Zod schema for input validation
const LuminaChatRequestSchema = z.object({
  userQuery: z.string(),
  chatHistory: z.array(z.any()).optional(),
  allTransactions: z.array(z.any()).optional(),
  imageBase64: z.string().optional().nullable(),
  audioText: z.string().optional(),
  isCoupleMode: z.boolean().optional(),
  isTTSActive: z.boolean().optional(),
  user: z.any().optional(),
});


export async function POST(request: NextRequest) {
  try {
    const rawInput = await request.json();

    // Validate the input
    const input = LuminaChatRequestSchema.parse(rawInput);

    // Re-utilize a lógica do seu luminaChatFlow para construir o prompt e o histórico
    // O 'true' no final indica para a função retornar apenas o material do prompt, sem executar a IA ainda.
    const { prompt, history, attachments } = await generateSuggestion(input, true);

    const stream = await render({
        stream: true,
        prompt: prompt,
        model: 'googleai/gemini-1.5-flash',
        history: history,
        attachments: attachments,
        output: {
          schema: z.object({
            text: z.string(),
            suggestions: z.array(z.string()),
          }),
        },
    });

    return new StreamingTextResponse(stream);


  } catch (error) {
    console.error('[LUMINA_STREAM_API_ERROR]', error);
    if (error instanceof z.ZodError) {
        return new Response(JSON.stringify({ error: "Invalid input data", details: error.errors }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    // Para outros erros, retorne um erro 500 genérico.
    return new Response(JSON.stringify({ error: "An internal server error occurred." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
