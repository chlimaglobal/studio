import { luminaChatFlow } from '@/ai/flows/lumina-chat';
import { NextRequest } from 'next/server';
import { StreamData, StreamingTextResponse } from 'ai';
import { z } from 'zod';
import { runFlow } from '@/ai/run';

export const dynamic = 'force-dynamic';

const LuminaChatRequestSchema = z.object({
  messages: z.array(z.object({ 
      id: z.string().optional(),
      role: z.enum(['user', 'assistant']), 
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
});


export async function POST(req: NextRequest) {
  try {
    const input = await req.json();
    const validatedInput = LuminaChatRequestSchema.parse(input);

    const { stream, response } = await runFlow(luminaChatFlow, validatedInput, { stream: true });

    const data = new StreamData();

    // Use a TransformStream to correctly process chunks from the Genkit stream
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        // Genkit stream chunks have an 'output' property
        if (chunk.output?.text) {
          controller.enqueue(chunk.output.text);
        }
      },
    });

    // Pipe the Genkit stream through our transform stream
    const responseStream = stream.pipeThrough(transformStream);

    // Handle the final response to append suggestions to the data stream
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
