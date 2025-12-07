
import { luminaChatFlow } from '@/ai/flows/lumina-chat';
import { NextRequest, NextResponse } from 'next/server';
import { StreamData, StreamingTextResponse } from 'ai';
import { z } from 'zod';
import { runFlow } from 'genkit';
import { streamFlow } from 'genkit/stream';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const input = await req.json();

    const { stream, result } = await streamFlow(luminaChatFlow, input);

    const data = new StreamData();

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.output) {
              controller.enqueue(JSON.stringify(chunk.output));
            }
          }
        } catch (e) {
          console.error("Error in readable stream:", e);
        } finally {
          controller.close();
        }
      }
    });

    const transformedStream = responseStream.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          try {
            const jsonChunk = JSON.parse(chunk);
            if(jsonChunk.text) {
              controller.enqueue(jsonChunk.text);
            }
          } catch(e) {
             // Ignore parsing errors for now
          }
        },
      })
    );
    
    result().then(finalResponse => {
        data.append({ finalSuggestions: finalResponse?.suggestions || [] });
        data.close();
    }).catch(err => {
        console.error('[LUMINA_STREAM_RESPONSE_ERROR]', err);
        data.append({ error: 'Erro ao finalizar a resposta.' });
        data.close();
    });

    return new StreamingTextResponse(transformedStream, {}, data);

  } catch (error) {
    console.error('[LUMINA_API_ROUTE_ERROR]', error);
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: "Input inválido", details: error.errors }), { status: 400 });
    }
    return new Response(JSON.stringify({ error: "Erro interno do servidor. Verifique os logs." }), { status: 500 });
  }
}
