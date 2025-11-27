
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { LuminaChatInput, LuminaChatOutput } from '@/lib/types';
import { LuminaChatInputSchema, LuminaChatOutputSchema } from '@/lib/types';
import { LUMINA_BASE_PROMPT } from '../lumina/prompt/luminaBasePrompt';

export async function generateSuggestion(input: LuminaChatInput): Promise<LuminaChatOutput> {
  return luminaChatFlow(input);
}

const luminaChatFlow = ai.defineFlow(
  {
    name: 'luminaChatFlow',
    inputSchema: LuminaChatInputSchema,
    outputSchema: LuminaChatOutputSchema,
    retrier: {
      maxAttempts: 3,
      backoff: {
        delayMs: 1500,
        multiplier: 2,
      },
    },
  },
  async (input) => {
    // 1. Prepare history
    const history = [
      { role: 'user', content: [{ text: LUMINA_BASE_PROMPT }] },
      { role: 'model', content: [{ text: 'Entendido. Estou pronta para ajudar.' }] },
      ...input.chatHistory.map((msg) => ({
        role: msg.role,
        content: [{ text: msg.text }],
      })),
    ] as any[];

    // 2. Prepare the full prompt text with all context
    const transactionsForContext = input.allTransactions.slice(0, 30);
    const fullPrompt = `
      - Transações Recentes (para contexto): ${JSON.stringify(transactionsForContext, null, 2)}
      - Modo Casal: ${input.isCoupleMode ? 'Ativado' : 'Desativado'}
      - Mensagem do Usuário: "${input.userQuery || ''}"
      - Áudio Transcrito (se houver): "${input.audioText || 'N/A'}"
    `;

    // 3. Call Gemini
    try {
      const model = 'googleai/gemini-2.5-flash';
      
      const { output } = await ai.generate({
        model,
        prompt: fullPrompt,
        history,
        output: {
          schema: LuminaChatOutputSchema,
        },
        attachments: input.imageBase64 ? [{ data: input.imageBase64 }] : undefined,
      });

      if (!output || !output.text) {
        throw new Error('A Lúmina não retornou uma resposta válida.');
      }

      return output;

    } catch (err) {
      console.error('🔥 ERRO AO CHAMAR GEMINI:', err);
      // Fallback de erro para garantir que sempre haja uma resposta
      return {
        text: 'Tive uma pequena instabilidade, mas já recuperei tudo. Como posso te ajudar agora?',
        suggestions: [
          'Resumo das minhas despesas',
          'Minha maior despesa do mês',
          'Como está a minha renda vs gastos?',
        ],
      };
    }
  }
);
