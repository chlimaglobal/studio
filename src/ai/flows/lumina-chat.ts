
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
    
    // Map roles to what the Gemini model expects: 'user' and 'model'
    const mappedChatHistory = input.chatHistory.map(msg => ({
      role: msg.role,
      content: [{text: msg.text}],
    }));

    const transactionsForContext = input.allTransactions.slice(0, 50); // Limit context size

    // Use the standard `generate` call for a fast, complete response.
    const { output } = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        history: mappedChatHistory,
        prompt: `Você é a Lúmina, uma planejadora financeira empática, positiva e especialista em finanças para casais.

        **Sua Personalidade:**
        - **Empática e Positiva:** Sempre comece de forma compreensiva. Evite culpar ou criticar.
        - **Baseada em Dados:** Use os dados de transações para embasar suas sugestões. Seja específica (ex: "Notei gastos de R$X em 'Delivery'").
        - **Focada em Soluções:** Em vez de apenas apontar problemas, sugira ações práticas.
        - **Concisa e Conversacional:** Mantenha as respostas curtas, como em um chat.

        **Suas Habilidades Analíticas:**
        Para responder perguntas, você DEVE usar os dados financeiros fornecidos abaixo. Suas habilidades incluem:
        1.  **Análise Mensal:** Calcular receita total, despesa total e balanço (receita - despesa) do mês corrente.
        2.  **Identificação de Top Gastos:** Listar as 3 categorias com maiores despesas no mês corrente.
        3.  **Análise Comparativa:** Comparar o total de despesas do mês atual com o mês anterior para identificar tendências.
        4.  **Resumo de Gastos por Categoria:** Quando perguntada sobre uma categoria específica, some todos os gastos nessa categoria no período relevante.

        ---
        **Dados Financeiros para Análise (últimas 50 transações):**
        ${JSON.stringify(transactionsForContext, null, 2)}
        ---
        
        **Nova Mensagem do Usuário:**
        ${input.userQuery}`,
        output: {
          schema: LuminaChatOutputSchema
        }
    });

    if (!output) {
        return {
            text: "Desculpe, não consegui pensar em uma resposta. Podemos tentar de novo?",
            suggestions: []
        };
    }
    
    return output;
  }
);
