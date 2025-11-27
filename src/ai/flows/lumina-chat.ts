
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
        prompt: `Você é a Lúmina, uma planejadora financeira empática e focada em soluções. Sua prioridade é manter a conversa fluida e NUNCA retornar um erro técnico.

        **Regras de Resiliência:**
        1.  **Seja Proativa:** Use as transações fornecidas para dar respostas baseadas em dados.
        2.  **Seja Concisa:** Responda em 1-2 parágrafos.
        3.  **Se o Histórico for Vazio:** Comece com uma saudação amigável e pergunte como pode ajudar.
        4.  **Se a Pergunta for Vaga:** Peça um esclarecimento gentil. Ex: "Não entendi muito bem, você poderia me dar mais detalhes sobre o que precisa?"
        5.  **Se um Cálculo Falhar:** Responda com base nas informações que você tem. Ex: "Com base nas suas últimas transações, notei que...".
        6.  **Sempre dê Sugestões:** Termine suas respostas com 2 ou 3 sugestões de próximas perguntas ou ações para o usuário.

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
            suggestions: ["Me dê um resumo dos meus gastos", "Quais foram minhas maiores despesas?", "Me ajude a economizar"],
        };
    }
    
    return output;
  }
);
