import { luminaChatFlow } from '@/ai/flows/lumina-chat';
import { NextRequest } from 'next/server';
import { StreamData, StreamingTextResponse } from 'ai';
import { z } from 'zod';
import { runFlow } from 'genkit';


export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const input = await req.json();

    const { stream, response } = await runFlow(luminaChatFlow, input, {stream: true});

    const data = new StreamData();

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const output = chunk.output;
            if (output?.text) {
              controller.enqueue(output.text);
            }
          }
        } catch (e) {
          console.error("Error in readable stream:", e);
        } finally {
          controller.close();
        }
      }
    });

    response.then(finalResponse => {
        data.append({ finalSuggestions: finalResponse.output?.suggestions || [] });
        data.close();
    }).catch(err => {
        console.error('[LUMINA_STREAM_RESPONSE_ERROR]', err);
        data.append({ error: 'Erro ao finalizar a resposta.' });
        data.close();
    });

    return new StreamingTextResponse(responseStream, {}, data);

  } catch (error) {
    console.error('[LUMINA_API_ROUTE_ERROR]', error);
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: "Input inválido", details: error.errors }), { status: 400 });
    }
    return new Response(JSON.stringify({ error: "Erro interno do servidor. Verifique os logs." }), { status: 500 });
  }
}
