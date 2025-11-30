// src/app/api/lumina/chat/stream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { luminaChatFlow, generateSuggestion } from '@/ai/flows/lumina-chat';
import type { LuminaChatInput } from '@/lib/types';
import { z } from 'zod';
import { LuminaChatInputSchema } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const input: LuminaChatInput = await request.json();

    // Re-utilize a lógica do seu luminaChatFlow para construir o prompt e o histórico
    const { prompt, history, attachments } = await generateSuggestion(input, true);

    const { stream } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt,
      history,
      attachments,
      stream: true,
      output: {
        format: 'text',
      },
    });

    const body = stream.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          controller.enqueue(chunk.text());
        },
      })
    );

    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[LUMINA_STREAM_ERROR]', error);
    let errorMessage = 'An internal server error occurred';
    if (error instanceof z.ZodError) {
        errorMessage = `Invalid request body: ${error.message}`;
        return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 400 });
    }
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}
