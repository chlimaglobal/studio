
import { NextRequest, NextResponse } from 'next/server';
import { StreamingTextResponse } from 'ai';
import { z } from 'zod';
import { generateChatContents } from '@/ai/flows/lumina-chat';
import { updateMemoryFromMessage } from '@/ai/lumina/memory/memoryStore';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    // 1. Update user memory in the background (fire and forget)
    if (input.user?.uid && lastUserMessage?.content) {
      updateMemoryFromMessage(input.user.uid, lastUserMessage.content).catch(console.error);
    }
    
    // 2. Build the full prompt history
    const contents = await generateChatContents(input as any);

    // 3. Call Gemini directly for streaming
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
    });

    const result = await model.generateContentStream({ contents });

    // 4. Convert the response into a Vercel AI SDK-compatible stream
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
      return NextResponse.json({ error: "Input inválido", details: error.errors }, { status: 400 });
    }
    // For any other error, return a generic server error
    return NextResponse.json({ error: "Desculpe, a Lúmina está temporariamente indisponível. Por favor, tente novamente em alguns instantes." }, { status: 500 });
  }
}
