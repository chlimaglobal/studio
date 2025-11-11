
import {NextRequest, NextResponse} from 'next/server';
import {generateSuggestionStream} from '@/ai/flows/lumina-chat';
import {LuminaChatInputSchema, LuminaChatInput} from '@/lib/types';
import {StreamingTextResponse} from 'ai';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input: LuminaChatInput = LuminaChatInputSchema.parse(body);

    const stream = await generateSuggestionStream(input);

    return new StreamingTextResponse(stream);
  } catch (e: any) {
    console.error('Lumina Chat API Error:', e);
    return new NextResponse(
      JSON.stringify({error: e.message || 'Falha ao processar a solicitação.'}),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
