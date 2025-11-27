
'use server';

/**
 * @fileOverview Lúmina's AI agent for the shared couple's message board.
 * This flow is optimized for FAST, non-streaming responses for couple's context.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { LuminaChatOutput } from '@/lib/types';
import { LuminaCoupleChatInputSchema, LuminaChatOutputSchema, DiagnosticSchema, type LuminaCoupleChatInput } from '@/lib/types';


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
      role: msg.role,
      content: [
        {
          text: msg.text,
        }
      ],
    }));

    const transactionsForContext = input.allTransactions.slice(0, 50);

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      history: mappedChatHistory,
      prompt: `Você é a Lúmina, planejadora financeira de casais. Sua prioridade é manter a conversa fluida, positiva e NUNCA retornar um erro técnico.

      **Regras de Resiliência para Casais:**
      1.  **Personalize a Mensagem:** Direcione a resposta a quem perguntou (${input.user.displayName}).
      2.  **Seja Conciliadora:** Use uma linguagem neutra e que incentive a colaboração.
      3.  **Se Faltar Dados (Ex: do parceiro):** Não mencione a ausência. Responda com base nos dados disponíveis. Ex: "Analisando as informações que temos aqui, percebi que..."
      4.  **Se um Cálculo Falhar:** Foque em uma análise qualitativa. Ex: "Vamos conversar sobre seus objetivos financeiros para este mês?"
      5.  **Sempre dê Sugestões Colaborativas:** Termine com sugestões de perguntas que o casal pode discutir.

      **Contexto para Análise:**
      - **Usuário Atual:** ${input.user.displayName}
      - **Parceiro(a):** ${input.partner.displayName}
      - **Transações Combinadas:** ${JSON.stringify(transactionsForContext, null, 2)}
      - **Nova Mensagem de ${input.user.displayName}:** ${input.userQuery}`,
      output: {
        schema: LuminaChatOutputSchema,
      }
    });

    if (!output) {
        return {
            text: "Peço desculpas, não consegui processar a resposta para vocês agora. Que tal tentarmos uma outra pergunta?",
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
