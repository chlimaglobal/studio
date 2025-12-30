
import { NextRequest, NextResponse } from 'next/server';
import { StreamData, StreamingTextResponse } from 'ai';
import { z } from 'zod';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import type { LuminaChatInput, LuminaChatOutput } from '@/lib/definitions';


export const dynamic = 'force-dynamic';

// Este schema valida o corpo da requisição que vem do hook `useChat`
const ApiRequestSchema = z.object({
  messages: z.array(z.object({ 
      id: z.string().optional(),
      role: z.enum(['user', 'assistant', 'model']), 
      content: z.string() 
    })).optional(),
  data: z.object({ // O hook `useChat` pode enviar dados adicionais aqui
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
  }).optional(),
});


export async function POST(req: NextRequest) {
  try {
    const rawInput = await req.json();
    
    // Mapeia o input da API para o formato esperado pela Cloud Function (LuminaChatInput)
    const functionInput: LuminaChatInput = {
      chatHistory: rawInput.messages || [],
      userQuery: rawInput.data?.userQuery || rawInput.messages?.slice(-1)[0]?.content || '',
      allTransactions: rawInput.data?.allTransactions,
      imageBase64: rawInput.data?.imageBase64,
      audioText: rawInput.data?.audioText,
      isCoupleMode: rawInput.data?.isCoupleMode,
      isTTSActive: rawInput.data?.isTTSActive,
      user: rawInput.data?.user,
    };
    
    const functions = getFunctions(app, 'us-central1');
    const luminaChatCallable = httpsCallable<LuminaChatInput, { data: LuminaChatOutput }>(functions, 'luminaChat');
    
    // Await a resposta completa, já que a Cloud Function v2 não suporta streaming de forma nativa para o cliente
    const result = await luminaChatCallable(functionInput);
    
    // A resposta da v2 callable já vem em `result.data`
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

    // Trata erros específicos do Firebase Functions
    if (error.code === 'functions/not-found' || (error.details && error.details.includes('NOT_FOUND'))) {
      errorMessage = "A assistente Lúmina está offline. A função não foi encontrada no servidor.";
    } else if (error.code === 'functions/permission-denied') {
        errorMessage = "Você não tem permissão para usar este recurso. Verifique sua assinatura.";
    } else if (error.code === 'functions/unauthenticated') {
        errorMessage = "Sessão expirada. Por favor, faça login novamente.";
    } else if (error instanceof z.ZodError) {
      errorMessage = "Dados inválidos enviados ao servidor.";
      return NextResponse.json({ error: errorMessage, details: error.errors }, { status: 400 });
    } else if (error.message) {
        // Usa a mensagem do erro se for mais específica
        errorMessage = error.message;
    }
    
    return new NextResponse(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  }
}
