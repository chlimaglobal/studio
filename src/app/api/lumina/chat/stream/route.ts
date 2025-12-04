
// src/app/api/lumina/chat/stream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { LuminaChatInput, LuminaChatInputSchema, LuminaChatOutputSchema } from "@/lib/types";
import { generateSuggestion } from '@/ai/flows/lumina-chat';
import { z } from 'zod';
import { StreamData, StreamingTextResponse } from 'ai';
import { GenerationCommon } from 'genkit/generate';


export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Schema atualizado: Adicione messages e userQuery como o useChat envia
const LuminaChatRequestSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant', 'system', 'function']), content: z.string() })).optional(),
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
    const input = LuminaChatRequestSchema.parse(rawInput);
    
    // Fix: A query do usuário vem como a última mensagem no array `messages`
    const userQueryFromMessages = input.messages?.findLast(m => m.role === 'user')?.content || '';
    
    const suggestionInput = {
      ...input,
      userQuery: userQueryFromMessages, // Usar a query real
      userId: input.user?.uid,
      chatHistory: input.messages, // Passar o histórico para a função
    };

    // Gere o prompt completo usando a lógica centralizada
    const { prompt, history, attachments } = await generateSuggestion(suggestionInput as LuminaChatInput, true) as { prompt: string, history: any[], attachments: GenerationCommon["attachments"] };

    // Inicie o fluxo de Genkit com o prompt correto
    const { stream, response } = ai.run('luminaChatFlow', {
      stream: true,
      input: {
        ...input,
        prebuiltPrompt: prompt,
        prebuiltHistory: history,
        prebuiltAttachments: attachments,
        userId: input.user?.uid,
        userQuery: userQueryFromMessages
      }
    });
    
    // Use o Vercel AI SDK para transmitir a resposta
    const aiStream = stream.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          // Garanta que apenas texto válido seja enfileirado
          if (chunk.output?.text && chunk.output.text.trim()) {
            controller.enqueue(chunk.output.text);
          }
        },
      })
    );
    
    const data = new StreamData();

    // Adicione a lógica para quando o streaming for concluído
    response.then(finalResponse => {
        data.append({ finalSuggestions: finalResponse.output?.suggestions || [] });
        data.close();
    }).catch(err => {
      console.error('[LUMINA_STREAM_ERROR] Error during final response processing:', err);
      data.append({ error: 'Erro ao finalizar a geração da resposta.' });
      data.close();
    });


    return new StreamingTextResponse(aiStream, {}, data);


  } catch (error) {
    console.error('[LUMINA_STREAM_API_ERROR]', error);
    if (error instanceof z.ZodError) {
        return new Response(JSON.stringify({ error: "Dados de entrada inválidos", details: error.errors }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    // Para outros erros, retorne um erro 500 genérico.
    return new Response(JSON.stringify({ error: "Ocorreu um erro interno no servidor." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
