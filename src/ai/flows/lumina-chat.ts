
'use server';

import { z } from 'zod';
import type { LuminaChatInput, LuminaChatOutput } from '@/lib/types';
import {
  LUMINA_BASE_PROMPT,
  LUMINA_VOICE_COMMAND_PROMPT,
  LUMINA_SPEECH_SYNTHESIS_PROMPT,
} from '@/ai/lumina/prompt/luminaBasePrompt';
import { getUserMemory, updateMemoryFromMessage } from '@/ai/lumina/memory/memoryStore';
import { defineFlow } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { LuminaChatInputSchema, LuminaChatOutputSchema } from '@/lib/types';
import { generate, stream } from 'genkit/ai';

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


export const luminaChatFlow = defineFlow(
  {
    name: 'luminaChatFlow',
    inputSchema: LuminaChatInputSchema,
    outputSchema: LuminaChatOutputSchema,
    stream: z.object({
        text: z.string(),
    }),
  },
  async function* (input) {
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

    const history: any[] = (input.messages || [])
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map((msg: any) => {
          const role = msg.role === 'assistant' ? 'model' : 'user';
          return { role, parts: [{ text: msg.content || '' }] };
      });
    
    const lastUserMessageParts: any[] = [{ text: userQuery || '(vazio)' }];
    if (input.imageBase64) {
      lastUserMessageParts.push({
        inline_data: {
          mime_type: 'image/png', // Assuming PNG, adjust if you support more types
          data: input.imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
        },
      });
    }

    try {
        const resultStream = await stream({
            model: googleAI('gemini-1.5-flash'),
            prompt: {
                system: systemPrompt,
                history: history,
                messages: [{ role: 'user', content: lastUserMessageParts }]
            },
            config: {
                temperature: 0.7,
            },
        });
        
        let fullText = '';
        for await (const chunk of resultStream) {
            const textChunk = chunk.text();
            if (textChunk) {
                fullText += textChunk;
                yield { text: textChunk };
            }
        }

        return {
          text: fullText || "Tudo bem! Como posso te ajudar hoje?",
          suggestions: [],
        };
        
    } catch (err: any) {
        console.error("ERRO GEMINI:", err.message);
        const fallbackText = "Desculpa, estou com um probleminha técnico agora... Mas posso te ajudar com um resumo rápido dos seus gastos ou te dar uma dica de economia enquanto isso arruma?";
        yield { text: fallbackText };
        return {
            text: fallbackText,
            suggestions: ["Resumo do mês", "Maiores gastos", "Quanto economizei?"],
        };
    }
  }
);
