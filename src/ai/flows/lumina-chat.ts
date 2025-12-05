
// src/ai/flows/lumina-chat.ts
import { z } from 'zod';
import type { LuminaChatInput } from '@/lib/types';
import {
  LUMINA_BASE_PROMPT,
  LUMINA_VOICE_COMMAND_PROMPT,
  LUMINA_SPEECH_SYNTHESIS_PROMPT,
} from '@/ai/lumina/prompt/luminaBasePrompt';
import { getUserMemory, updateMemoryFromMessage } from '@/ai/lumina/memory/memoryStore';


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

  const contents: any[] = [];
  
  // Start with the system instruction (as a user message, then model confirmation)
  // This is a common pattern to inject system-level instructions in Gemini
  contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
  contents.push({ role: 'model', parts: [{ text: 'Entendido. Estou pronta para ajudar seguindo essas diretrizes.' }] });


  // Add the rest of the chat history
  if (input.messages && input.messages.length > 0) {
    input.messages.forEach((msg: any) => {
      // Don't re-add the last user message, we'll add it separately
      if (msg === input.messages[input.messages.length - 1] && msg.role === 'user') {
        return;
      }
      const role = msg.role === 'assistant' ? 'model' : 'user';
      const content = msg.content || '';
      if (role === 'user' && !content.trim()) return;
      contents.push({ role, parts: [{ text: content }] });
    });
  }

  // Add the last user message along with any potential image data
  const lastUserMessageParts: any[] = [{ text: userQuery || '(vazio)' }];
  if (input.imageBase64) {
    lastUserMessageParts.push({
      inlineData: {
        mimeType: 'image/png', // Assuming PNG, adjust if you support more types
        data: input.imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
      },
    });
  }
  
  // Make sure we add the last user message
  contents.push({ role: 'user', parts: lastUserMessageParts });

  return contents;
}


// The luminaChatFlow is no longer needed as the logic is moved to the API route
// for direct streaming with Vercel AI SDK. We keep the file to export generateChatContents.

export { updateMemoryFromMessage };
