// src/app/api/lumina/chat/stream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { luminaChatFlow } from '@/ai/flows/lumina-chat'; // sua função normal que já funciona
import type { LuminaChatInput } from '@/lib/types';

export const dynamic = 'force-dynamic'; // força streaming sem cache
export const maxDuration = 60; // 60s pro Gemini responder

export async function POST(request: NextRequest) {
  try {
    const input: LuminaChatInput = await request.json();

    const encoder = new TextEncoder(); // pra codificar texto em chunks binários

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Chama sua função normal da Lúmina (que já é async e funciona)
          const result = await luminaChatFlow(input);

          // Simula streaming: divide em palavras e envia rápido (30ms = resposta viva)
          const words = (result.text || 'Oi! Como posso te ajudar com finanças hoje?').split(' ');
          for (const word of words) {
            if (controller.signal.aborted) break; // para se o user cancelar
            const chunk = encoder.encode(`${word} `);
            controller.enqueue(chunk);
            await new Promise(resolve => setTimeout(resolve, 30)); // velocidade da Lúmina
          }

          // Envia sugestões no final (rápido)
          if (result.suggestions && result.suggestions.length > 0) {
            const suggestionsChunk = encoder.encode(`\n\n💡 Sugestões: ${result.suggestions.join(' · ')}`);
            controller.enqueue(suggestionsChunk);
          }

        } catch (error) {
          console.error('Erro no streaming da Lúmina:', error);
          controller.enqueue(encoder.encode('Desculpe, tive um tropeço técnico. Vamos tentar de novo?'));
        } finally {
          controller.close();
        }
      },
      cancel(reason) {
        console.log('Streaming cancelado:', reason);
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8', // ou 'text/event-stream' pra SSE
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*', // se precisar de CORS
      },
    });

  } catch (error) {
    return NextResponse.json({ error: 'Erro ao iniciar chat' }, { status: 500 });
  }
}
