'use server';

import { z } from 'zod';
import type { LuminaChatInput, LuminaChatOutput } from '@/lib/types';
import {
  LUMINA_BASE_PROMPT,
  LUMINA_VOICE_COMMAND_PROMPT,
  LUMINA_SPEECH_SYNTHESIS_PROMPT,
} from '@/ai/lumina/prompt/luminaBasePrompt';
import { getUserMemory, updateMemoryFromMessage } from '@/ai/lumina/memory/memoryStore';
import { ai } from '@/ai/genkit';
import { LuminaChatInputSchema, LuminaChatOutputSchema } from '@/lib/types';
import { googleAI } from '@genkit-ai/google-genai';
import { Message } from 'genkit/experimental/ai';

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


export const luminaChatFlow = ai.defineFlow(
  {
    name: 'luminaChatFlow',
    inputSchema: LuminaChatInputSchema,
    outputSchema: LuminaChatOutputSchema,
  },
  async function (input) {
    const userId = input.user?.uid || 'default';
    const userQuery = (input.userQuery || '').trim();
    const audioText = (input.audioText || '').trim();
    const isTTSActive = input.isTTSActive || false;
    const transactionsForContext = (input.allTransactions || []).slice(0, 30);
    const transactionsJSON = JSON.stringify(transactionsForContext, null, 2);
    const memoryContext = await buildMemoryContext(userId);

    if (userQuery) {
      await updateMemoryFromMessage(userId, userQuery);
    }

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

    const history: Message[] = (input.chatHistory || [])
      .filter(msg => msg.role === 'user' || msg.role === 'assistant' || msg.role === 'model')
      .map((msg: any) => {
          const role = msg.role === 'assistant' ? 'model' : msg.role;
          return { role, content: [{ text: msg.content || '' }] };
      });
    
    const lastUserMessageParts: any[] = [{ text: userQuery || '(vazio)' }];
    if (input.imageBase64) {
      lastUserMessageParts.push({
        media: {
            contentType: 'image/png', // Assuming PNG, adjust if you support more types
            url: `data:image/png;base64,${input.imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')}`,
        },
      });
    }

    try {
        const result = await ai.generate({
            model: googleAI.model('gemini-1.5-flash'),
            system: systemPrompt,
            prompt: lastUserMessageParts,
            history: history,
            config: {
                temperature: 0.7,
            },
        });
        
        const fullText = result.text;
        
        return {
          text: fullText || "Tudo bem! Como posso te ajudar hoje?",
          suggestions: [],
        };
        
    } catch (err: any) {
        console.error("ERRO GEMINI:", err.message);
        const fallbackText = "Desculpa, estou com um probleminha técnico agora... Mas posso te ajudar com um resumo rápido dos seus gastos ou te dar uma dica de economia enquanto isso arruma?";
        return {
            text: fallbackText,
            suggestions: ["Resumo do mês", "Maiores gastos", "Quanto economizei?"],
        };
    }
  }
);
