
import { NextRequest } from 'next/server';
import { StreamData, StreamingTextResponse } from 'ai';
import { z } from 'zod';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import type { LuminaChatOutput } from '@/lib/types';


export const dynamic = 'force-dynamic';

const LuminaChatRequestSchema = z.object({
  messages: z.array(z.object({ 
      id: z.string().optional(),
      role: z.enum(['user', 'assistant', 'model']), 
      content: z.string() 
    })).optional(),
  userQuery: z.string().optional(),
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


export async function POST(req: NextRequest) {
  try {
    const input = await req.json();
    // Re-shape the message history for the callable function
    const validatedInput = {
      ...LuminaChatRequestSchema.parse(input),
      chatHistory: input.messages || [],
    };

    const functions = getFunctions(app, 'us-central1');
    const luminaChatCallable = httpsCallable<any, { data: LuminaChatOutput }>(functions, 'luminaChat');
    
    // As the cloud function is not streaming, we call it and await the full response.
    const result = await luminaChatCallable(validatedInput);
    const luminaResponse = result.data; // The data is directly on result.data now

    // To maintain compatibility with the useChat hook, we create a simple stream
    // that yields the full response at once.
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(luminaResponse.text));
        controller.close();
      },
    });

    const data = new StreamData();
    data.append({ finalSuggestions: luminaResponse.suggestions || [] });
    data.close();

    return new StreamingTextResponse(stream, {}, data);

  } catch (error) {
    console.error('[LUMINA_API_ROUTE_ERROR]', error);
    let errorMessage = "Erro interno do servidor. Verifique os logs.";
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: "Input inválido", details: error.errors }), { status: 400 });
    }
    if(error instanceof Error) {
        errorMessage = error.message;
    }
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}
