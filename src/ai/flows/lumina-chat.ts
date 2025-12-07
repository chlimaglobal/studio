
// src/ai/flows/lumina-chat.ts
import { z } from 'zod';
import type { LuminaChatInput } from '@/lib/types';
import {
  LUMINA_BASE_PROMPT,
  LUMINA_VOICE_COMMAND_PROMPT,
  LUMINA_SPEECH_SYNTHESIS_PROMPT,
} from '@/ai/lumina/prompt/luminaBasePrompt';
import { getUserMemory, updateMemoryFromMessage } from '@/ai/lumina/memory/memoryStore';
import { generate } from 'genkit/ai';
import { googleAI } from '@genkit-ai/google-genai';

async function buildMemoryContext(userId: string) {
  const mem = await getUserMemory(userId);
  return `
### MEMÓRIA DO USUÁRIO (use, mas não exponha explicitamente):
- Preferências do usuário: ${mem?.preferences ? JSON.stringify(mem.preferences, null, 2) : '{}'}
- Informações declaradas anteriormente: ${mem?.facts ? JSON.stringify(mem.facts, null, 2) : '{}'}
- Hábitos financeiros: ${mem?.financialHabits ? JSON.stringify(mem.financialHabits, null, 2) : '{}'}
- Correções que o usuário pediu: ${mem?.dontSay ? JSON.stringify(mem.dontSay, null, 2) : '[]'}
(Use isso para responder melhor, mas NUNCA exponha ao usuário.)
`;
}

// This function is now exported to be used directly by the API route
export async function generateChatContents(input: LuminaChatInput): Promise<any[]> {
  const userId = input.user?.uid || 'default';
  const userQuery = (input.userQuery || '').trim();
  const audioText = (input.audioText || '').trim();
  const isTTSActive = input.isTTSActive || false;
  const transactionsForContext = (input.allTransactions || []).slice(0, 30);
  const transactionsJSON = JSON.stringify(transactionsForContext, null, 2);
  const memoryContext = await buildMemoryContext(userId);

  // This is the System Instruction now
  const systemPrompt = [
    LUMINA_BASE_PROMPT,
    audioText ? LUMINA_VOICE_COMMAND_PROMPT : '',
    isTTSActive ? LUMINA_SPEECH_SYNTHESIS_PROMPT : '',
    '',
    memoryContext,
    '',
    '### CONTEXTO DO APP:',
    `- Modo Casal: ${input.isCoupleMode ? 'Ativado' : 'Desativado'}`,
    `- Últimas transações:`,
    transactionsJSON,
  ].join('\n');

  const history: any[] = (input.messages || [])
    .filter(msg => msg.role === 'user' || msg.role === 'assistant')
    .map((msg: any) => {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        return { role, parts: [{ text: msg.content || '' }] };
    });

  const lastUserMessageParts: any[] = [{ text: userQuery || '(vazio)' }];
  if (input.imageBase64) {
    lastUserMessageParts.push({
      inlineData: {
        mimeType: 'image/png', // Assuming PNG, adjust if you support more types
        data: input.imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
      },
    });
  }
  
  const model = googleAI.model('gemini-1.5-flash');
  const result = await generate({
    model,
    prompt: lastUserMessageParts[0].text,
    history: history,
    config: {
      temperature: 0.7,
    },
    // @ts-ignore
    system: systemPrompt,
    attachments: lastUserMessageParts.length > 1 ? [{ inlineData: lastUserMessageParts[1].inlineData }] : [],
  });
  
  return result.candidates;
}


// The luminaChatFlow is no longer needed as the logic is moved to the API route
// for direct streaming with Vercel AI SDK. We keep the file to export generateChatContents.

export { updateMemoryFromMessage };
