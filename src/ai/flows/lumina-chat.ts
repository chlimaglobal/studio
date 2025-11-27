
'use server';

/**
 * @fileOverview Lúmina's AI agent for the shared message board.
 * This flow is optimized for FAST, non-streaming responses.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { LuminaChatInput, LuminaChatOutput } from '@/lib/types';
import { LuminaChatInputSchema, LuminaChatOutputSchema } from '@/lib/types';


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
        delayMs: 2000,
        multiplier: 2,
      },
    },
  },
  async (input) => {
    
    const mappedChatHistory = input.chatHistory.map(msg => ({
      role: msg.role,
      content: [{text: msg.text}],
    }));

    const transactionsForContext = input.allTransactions.slice(0, 50);

    const { output } = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        history: mappedChatHistory,
        prompt: `Você é a Lúmina, uma planejadora financeira empática, positiva, baseada em dados e focada em soluções. Use as transações para responder às perguntas do usuário de forma concisa. Dê sugestões de próximos passos.

        **Contexto para Análise:**
        - **Transações:** ${JSON.stringify(transactionsForContext, null, 2)}
        - **Nova Mensagem do Usuário:** ${input.userQuery}`,
        output: {
          schema: LuminaChatOutputSchema
        }
    });

    if (!output) {
        return {
            text: "Desculpe, não consegui pensar em uma resposta. Podemos tentar de novo?",
            suggestions: [],
        };
    }
    
    return output;
  }
);
