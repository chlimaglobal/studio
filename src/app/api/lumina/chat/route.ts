'use server';

import { luminaChatFlow } from '@/ai/flows/lumina-chat';
import type { LuminaChatInput } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const input: LuminaChatInput = await request.json();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        const result = await luminaChatFlow(input); // sua função normal que já funciona

        // Envia a resposta completa em pedaços pequenos pra simular streaming rápido
        const words = result.text.split(' ');
        for (const word of words) {
          controller.enqueue(encoder.encode(word + ' '));
          await new Promise(r => setTimeout(r, 30)); // velocidade perfeita da Lúmina
        }

        // Envia as sugestões rápidas no final
        if (result.suggestions?.length) {
          controller.enqueue(encoder.encode('\n\n💡 ' + result.suggestions.join(' · ')));
        }
      } catch (error) {
        controller.enqueue(encoder.encode('Desculpe, tive um pequeno tropeço. Pode repetir?'));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
