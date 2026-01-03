
import { NextRequest, NextResponse } from 'next/server';
import { StreamData, StreamingTextResponse } from 'ai';
import { z } from 'zod';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import type { LuminaChatInput, LuminaChatOutput } from '@/types';


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
    
    const validatedBody = LuminaChatRequestSchema.parse(input);

    const functionInput: LuminaChatInput = {
      chatHistory: validatedBody.messages || [],
      userQuery: validatedBody.userQuery || validatedBody.messages?.[validatedBody.messages.length - 1]?.content || '',
      allTransactions: validatedBody.allTransactions,
      imageBase64: validatedBody.imageBase64,
      audioText: validatedBody.audioText,
      isCoupleMode: validatedBody.isCoupleMode,
      isTTSActive: validatedBody.isTTSActive,
      user: validatedBody.user,
    };
    
    const functions = getFunctions(app, 'us-central1');
    const luminaChatCallable = httpsCallable<LuminaChatInput, { data: LuminaChatOutput }>(functions, 'luminaChat');
    
    const result = await luminaChatCallable(functionInput);
    
    const luminaResponse = result.data.data;

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

    if (error.code === 'functions/permission-denied') {
        errorMessage = 'Você precisa de uma assinatura Premium para usar este recurso.';
    } else if (error.code === 'functions/not-found' || error.message.includes('not-found')) {
      errorMessage = "A assistente Lúmina está offline. A função não foi encontrada no servidor.";
    } else if (error.code === 'functions/unauthenticated') {
        errorMessage = 'Sessão expirada. Por favor, faça login novamente.';
    } else if (error instanceof z.ZodError) {
      errorMessage = "Dados inválidos enviados ao servidor.";
      return NextResponse.json({ error: errorMessage, details: error.errors }, { status: 400 });
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
