
'use server';

/**
 * @fileOverview Lúmina's AI agent for the shared couple's message board.
 * This flow is optimized for FAST, non-streaming responses for couple's context.
 */

import { ai } from '@/ai/genkit';
import type { LuminaChatOutput, LuminaCoupleChatInput } from '@/lib/types';
import { LuminaCoupleChatInputSchema, LuminaChatOutputSchema } from '@/lib/types';
import { LUMINA_BASE_PROMPT } from '../prompt/luminaBasePrompt';


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
        delayMs: 2000,
        multiplier: 2,
      },
    },
  },

  async (input) => {

    const mappedChatHistory = input.chatHistory.map(msg => ({
      role: msg.role === 'lumina' ? 'model' as const : 'user' as const,
      content: [
        {
          text: msg.text || '',
        }
      ],
    }));

    const transactionsForContext = input.allTransactions.slice(0, 50);

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      history: mappedChatHistory,
      prompt: `${LUMINA_BASE_PROMPT}

**Contexto para Análise:**
- **Usuário Atual:** ${input.user.displayName}
- **Parceiro(a):** ${input.partner.displayName}
- **Transações Combinadas:** ${JSON.stringify(transactionsForContext, null, 2)}
- **Nova Mensagem de ${input.user.displayName}:** ${input.userQuery}
- **Modo Casal:** Ativado`,
      output: {
        schema: LuminaChatOutputSchema,
      }
    });

    if (!output || !output.text) {
        return {
            text: `Olá ${input.user.displayName}! Como posso ajudar vocês a planejarem suas finanças hoje?`,
            suggestions: [
                "Qual foi nosso maior gasto este mês?",
                "Como podemos economizar juntos?",
                "Vamos definir uma meta financeira?"
            ],
        };
    }

    return output;
  }
);
