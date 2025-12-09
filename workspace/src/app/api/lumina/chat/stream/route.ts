import { NextRequest } from 'next/server';
import { StreamData, StreamingTextResponse } from 'ai';
import { z } from 'zod';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { LuminaChatInput, LuminaChatOutput } from '@/lib/types';
import { runFlow } from 'genkit';


export const dynamic = 'force-dynamic';

// O schema de validação para o corpo da requisição
const LuminaChatRequestSchema = z.object({
  messages: z.array(z.object({ 
      id: z.string().optional(),
      role: z.enum(['user', 'assistant']), 
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
    const validatedInput = LuminaChatRequestSchema.parse(input);

    const functions = getFunctions(getApp(), 'us-central1');
    const luminaChatCallable = httpsCallable<LuminaChatInput, { data: LuminaChatOutput }>(functions, 'luminaChat');
    
    // Como a função de nuvem não suporta streaming diretamente para o cliente dessa forma,
    // vamos chamar a função e retornar a resposta completa de uma vez.
    // O cliente precisará ser adaptado para não esperar um stream.
    const result = await luminaChatCallable(validatedInput);
    const luminaResponse = result.data.data;

    // Para simular um stream de uma resposta completa:
    const readableStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(luminaResponse.text));
        controller.close();
      }
    });

    const data = new StreamData();
    data.append({ finalSuggestions: luminaResponse.suggestions || [] });
    data.close();

    return new StreamingTextResponse(readableStream, {}, data);

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
