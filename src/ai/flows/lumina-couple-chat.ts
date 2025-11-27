
'use server';

/**
 * @fileOverview Lúmina — fluxo de chat para casais.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { LuminaCoupleChatInput, LuminaChatOutput } from '@/lib/types';
import { LuminaCoupleChatInputSchema, LuminaChatOutputSchema } from '@/lib/types';
import { LUMINA_BASE_PROMPT } from '@/ai/lumina/prompt/luminaBasePrompt';


// === Função externa chamada pela aplicação ===
export async function generateCoupleSuggestion(input: LuminaCoupleChatInput): Promise<LuminaChatOutput> {
  return luminaCoupleChatFlow(input);
}

const luminaCoupleChatFlow = ai.defineFlow(
  {
    name: 'luminaCoupleChatFlow',
    inputSchema: LuminaCoupleChatInputSchema,
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
    
    const history = [
        { role: 'user', content: [{ text: LUMINA_BASE_PROMPT }] },
        { role: 'model', content: [{ text: "Entendido. Estou pronta para ajudar o casal." }] },
        ...input.chatHistory.map(msg => ({
          role: msg.role === 'lumina' ? 'model' : 'user',
          content: [
              { text: msg.text || '' }
          ]
        }))
    ] as any[];

    const transactionsForContext = input.allTransactions.slice(0, 50);

    const fullPrompt = `
      - User: ${input.user.displayName} (ID: ${input.user.uid})
      - Partner: ${input.partner.displayName} (ID: ${input.partner.uid})
      - Transações: ${JSON.stringify(transactionsForContext, null, 2)}
      - Query: ${input.userQuery || ""}
      - Modo Casal: Ativado
      - Áudio Transcrito: ${input.audioText || 'N/A'}
    `;

    try {
        const { output } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            prompt: fullPrompt,
            history,
            output: {
                schema: LuminaChatOutputSchema,
            },
        });

      if (!output || !output.text) {
        throw new Error("A Lúmina não retornou uma resposta válida para o casal.");
      }
      
      return output;

    } catch (err) {
      console.error("🔥 ERRO AO CHAMAR GEMINI (COUPLE):", err);
      return {
        text: "Tivemos uma pequena instabilidade, mas já estou de volta para ajudar vocês. Qual o próximo passo?",
        suggestions: [
          "Resumo das despesas do casal",
          "Quem gastou mais esse mês?",
          "Criar uma meta financeira juntos"
        ]
      };
    }
  }
);
