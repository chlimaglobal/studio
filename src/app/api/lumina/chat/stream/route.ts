
// src/app/api/lumina/chat/stream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { generateSuggestion } from '@/ai/flows/lumina-chat';
import type { LuminaChatInput } from '@/lib/types';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const input: LuminaChatInput = await request.json();

    // Re-utilize a lógica do seu luminaChatFlow para construir o prompt e o histórico
    const { prompt, history, attachments } = await generateSuggestion(input, true);

    const stream = await ai.runFlow('luminaChatFlow', {
      ...input,
      prebuiltPrompt: prompt,
      prebuiltHistory: history,
      prebuiltAttachments: attachments,
      stream: true,
    });
    
    // Create a new ReadableStream to pipe the output from Genkit
    const readableStream = new ReadableStream({
      async start(controller) {
        if (stream.outputStream) {
          const reader = stream.outputStream.getReader();
          const decoder = new TextDecoder();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              controller.enqueue(new TextEncoder().encode(chunk));
            }
          } catch (error) {
            console.error("Error reading stream from Genkit:", error);
            controller.enqueue(new TextEncoder().encode("Desculpe, tive um problema técnico. Vamos tentar novamente."));
            controller.error(error);
          } finally {
            controller.close();
          }
        } else {
          controller.close();
        }
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('[LUMINA_STREAM_ERROR]', error);
    if (error instanceof z.ZodError) {
        return new Response("SERVER_ERROR", { status: 400 });
    }
    return new Response("SERVER_ERROR", { status: 500 });
  }
}
