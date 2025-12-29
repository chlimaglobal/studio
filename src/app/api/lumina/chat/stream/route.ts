
import { NextRequest, NextResponse } from 'next/server';
import { StreamData, StreamingTextResponse } from 'ai';
import { z } from 'zod';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import type { LuminaChatInput, LuminaChatOutput } from '@/lib/definitions';


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
   partner: z.object({
    uid: z.string(),
    displayName: z.string().nullable(),
    email: z.string().nullable(),
    photoURL: z.string().nullable(),
  }).optional(),
});


export async function POST(req: NextRequest) {
  try {
    const input = await req.json();
    // Remapeia o histórico de mensagens para o formato esperado pelo backend
    const validatedInput: LuminaChatInput = {
      ...LuminaChatRequestSchema.parse(input),
      chatHistory: input.messages || [],
    };

    const functions = getFunctions(app, 'us-central1');
    // A função retornará um tipo { data: LuminaChatOutput }
    const luminaChatCallable = httpsCallable<LuminaChatInput, { data: LuminaChatOutput }>(functions, 'luminaChat');
    
    // Await the full response from the non-streaming cloud function
    const result = await luminaChatCallable(validatedInput);
    
    // Extrai os dados corretamente (a resposta está em result.data.data)
    const luminaResponse = result.data.data;

    // Para manter a compatibilidade com o hook `useChat`, criamos um stream simples
    // que entrega a resposta completa de uma só vez.
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

  } catch (error: any) {
    console.error('[LUMINA_API_ROUTE_ERROR]', error);
    let errorMessage = "Ocorreu um erro ao se comunicar com a Lúmina. Tente novamente mais tarde.";
    if (error instanceof z.ZodError) {
      errorMessage = "Dados inválidos enviados ao servidor.";
      return NextResponse.json({ error: errorMessage, details: error.errors }, { status: 400 });
    }
    if (error.code === 'functions/not-found') {
        errorMessage = "A assistente Lúmina está offline. A função não foi encontrada no servidor."
    }
    
    // Retorna uma resposta de erro padronizada em JSON
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
