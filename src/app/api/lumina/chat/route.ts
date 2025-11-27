
import { NextResponse } from 'next/server';
import { generateSuggestion } from '@/ai/lumina/flows/lumina-chat-flow';
import type { LuminaChatInput } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const data: LuminaChatInput = await req.json();
    const output = await generateSuggestion(data);
    return NextResponse.json(output);
  } catch (error) {
    console.error('[LUMINA_CHAT_API_ERROR]', error);
    return new NextResponse(
      JSON.stringify({
        text: "Ocorreu um erro no servidor ao processar sua solicitação. A equipe já foi notificada.",
        suggestions: []
      }), 
      { status: 500 }
    );
  }
}
