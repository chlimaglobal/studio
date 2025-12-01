// src/app/api/lumina/chat/stream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { LuminaChatInput, LuminaChatInputSchema, LuminaChatOutputSchema } from "@/lib/types";
import {
  LUMINA_BASE_PROMPT,
  LUMINA_VOICE_COMMAND_PROMPT,
  LUMINA_SPEECH_SYNTHESIS_PROMPT,
} from "@/ai/lumina/prompt/luminaBasePrompt";
import { generateSuggestion, luminaChatFlow } from '@/ai/flows/lumina-chat';
import { z } from 'zod';
import { StreamingTextResponse } from 'ai';
import { GenerationCommon } from 'genkit/generate';


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
  user: z.object({
      uid: z.string(),
      displayName: z.string().nullable(),
      email: z.string().nullable(),
      photoURL: z.string().nullable(),
  }).optional(),
});


export async function POST(request: NextRequest) {
  try {
    const rawInput = await request.json();

    // Validate the input
    const input = LuminaChatRequestSchema.parse(rawInput);
    
    // The input for `generateSuggestion` needs a `userId` property.
    const suggestionInput = {
      ...input,
      userId: input.user?.uid, // Extract userId from user object
    };

    // Re-utilize a lógica do seu luminaChatFlow para construir o prompt e o histórico
    const { prompt, history, attachments } = await generateSuggestion(suggestionInput as LuminaChatInput, true) as { prompt: string, history: any[], attachments: GenerationCommon["attachments"] };


    const { stream, response } = await ai.run('luminaChatFlow', {
      stream: true,
      input: {
        ...input,
        prebuiltPrompt: prompt,
        prebuiltHistory: history,
        prebuiltAttachments: attachments,
        userId: input.user?.uid, // Pass userId to the flow
      }
    });
    
    // Use the Vercel AI SDK to stream the response
    const aiStream = stream.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          controller.enqueue(chunk.output?.text || '');
        },
      })
    );

    return new StreamingTextResponse(aiStream);


  } catch (error) {
    console.error('[LUMINA_STREAM_API_ERROR]', error);
    if (error instanceof z.ZodError) {
        return new Response(JSON.stringify({ error: "Invalid input data", details: error.errors }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    // Para outros erros, retorne um erro 500 genérico.
    return new Response(JSON.stringify({ error: "An internal server error occurred." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
