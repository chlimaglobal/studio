
import { ai } from '@/ai/genkit';
import { luminaChatFlow } from '@/ai/flows/lumina-chat';
import { NextRequest, NextResponse } from 'next/server';
import { StreamData, StreamingTextResponse } from 'ai';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const LuminaChatRequestSchema = z.object({
  messages: z.array(z.object({ 
      id: z.string().optional(),
      role: z.enum(['user', 'assistant', 'model']), 
      content: z.string() 
    })).optional(),
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

    const lastUserMessage = rawInput.messages?.[rawInput.messages.length - 1];

    const inputToParse = {
        ...rawInput,
        userQuery: lastUserMessage?.content || '',
    }
    
    const input = LuminaChatRequestSchema.parse(inputToParse);

    // Since we are streaming, we can't use ai.run() directly with the flow.
    // Instead, we will replicate the logic inside the flow that prepares the prompt
    // and then call the Gemini model directly with streaming.
    // This is a temporary workaround until Genkit streaming is better integrated with Vercel AI SDK.

    // 1. Build the prompt context using the same logic as the flow
    const { generateChatContents } = await import('@/ai/flows/lumina-chat');
    const { updateMemoryFromMessage } = await import('@/ai/lumina/memory/memoryStore');
    const { GoogleGenerativeAI } = await import('@google/generative-ai');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    // Ensure user UID exists for memory update
    if (input.user?.uid && lastUserMessage?.content) {
      await updateMemoryFromMessage(input.user.uid, lastUserMessage.content);
    }
    
    const contents = await generateChatContents(input as any);

    const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
    });

    const result = await model.generateContentStream(contents);

    // Convert the response into a friendly text-stream
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
              controller.enqueue(new TextEncoder().encode(text));
          }
        }
        controller.close();
      },
    });

    return new StreamingTextResponse(stream);

  } catch (error) {
    console.error('[LUMINA_API_ROUTE_ERROR]', error);
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: "Input inválido", details: error.errors }), { status: 400 });
    }
    return new Response(JSON.stringify({ error: "Erro interno do servidor. Verifique os logs." }), { status: 500 });
  }
}

