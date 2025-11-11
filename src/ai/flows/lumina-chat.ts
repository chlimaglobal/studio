
'use server';

/**
 * @fileOverview Lúmina's AI agent for the shared message board.
 * This flow is optimized for streaming responses.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { LuminaChatInput } from '@/lib/types';
import { LuminaChatInputSchema } from '@/lib/types';
import { stream } from 'genkit/stream';

// The output schema for the streaming flow is just a string.
export const LuminaChatOutputSchema = z.string();
export type LuminaChatOutput = z.infer<typeof LuminaChatOutputSchema>;


export async function generateSuggestionStream(input: LuminaChatInput) {
    return luminaChatFlow(input);
}

const luminaChatFlow = ai.defineFlow(
  {
    name: 'luminaChatFlow',
    inputSchema: LuminaChatInputSchema,
    outputSchema: z.string(), // The final output is the full string
    stream: true, // Enable streaming for this flow
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
      role: msg.role === 'lumina' ? 'model' : 'user',
      content: [{text: msg.text}],
    }));

    // Use generateStream instead of a simple prompt call
    const { response, stream: responseStream } = await ai.generateStream({
        model: 'googleai/gemini-2.5-flash',
        history: mappedChatHistory,
        prompt: `**Dados Financeiros para Análise:**
        {{{json allTransactions}}}

        **Sua Personalidade:**
        - **Empática e Positiva:** Sempre comece de forma compreensiva. Evite culpar ou criticar.
        - **Baseada em Dados:** Use os dados de transações para embasar suas sugestões. Seja específica (ex: "Notei gastos de R$X em 'Delivery'").
        - **Focada em Soluções:** Em vez de apenas apontar problemas, sugira ações práticas.
        - **Concisa e Conversacional:** Mantenha as respostas curtas, como em um chat.

        **Suas Habilidades Analíticas:**
        Para responder perguntas, você DEVE usar os dados financeiros fornecidos. Suas habilidades incluem:
        1.  **Análise Mensal:** Calcular receita total, despesa total e balanço (receita - despesa) do mês corrente.
        2.  **Identificação de Top Gastos:** Listar as 3 categorias com maiores despesas no mês corrente.
        3.  **Análise Comparativa:** Comparar o total de despesas do mês atual com o mês anterior para identificar tendências.
        4.  **Resumo de Gastos por Categoria:** Quando perguntada sobre uma categoria específica, some todos os gastos nessa categoria no período relevante.
        
        **Nova Mensagem do Usuário:**
        ${input.userQuery}`,
    });

    return new ReadableStream({
      async start(controller) {
        for await (const chunk of responseStream) {
            controller.enqueue(chunk.text);
        }
        controller.close();
      },
    });
  }
);
