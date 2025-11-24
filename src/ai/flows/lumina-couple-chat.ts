
'use server';

/**
 * @fileOverview Lúmina's AI agent for the shared couple's message board.
 * This flow is optimized for FAST, non-streaming responses for couple's context.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { LuminaChatInput, AppUser } from '@/lib/types';
import { LuminaChatOutputSchema } from '@/lib/types';


export const LuminaCoupleChatInputSchema = z.object({
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'model']),
    text: z.string(),
  })).describe('The recent history of the conversation.'),
  userQuery: z.string().describe('The new message from the user.'),
  allTransactions: z.array(z.any()).describe('A list of all financial transactions for context.'),
  user: z.any().describe('The user object of the person sending the message.'),
  partner: z.any().describe('The user object of the partner.'),
});
export type LuminaCoupleChatInput = z.infer<typeof LuminaCoupleChatInputSchema>;


export async function generateCoupleSuggestion(input: LuminaCoupleChatInput): Promise<string> {
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
      content: [{text: msg.text}],
    }));

    const transactionsForContext = input.allTransactions.slice(0, 50);

    const { output } = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        history: mappedChatHistory,
        prompt: `Você é a Lúmina, uma planejadora financeira empática, positiva e especialista em finanças para casais.
        O usuário atual que está enviando a mensagem é ${input.user.displayName}. O parceiro(a) é ${input.partner.displayName}.

        **Sua Personalidade:**
        - **Empática e Positiva:** Sempre comece de forma compreensiva. Evite culpar ou criticar.
        - **Baseada em Dados:** Use os dados de transações (que incluem dados de ambos) para embasar suas sugestões. Seja específica (ex: "Notei gastos de R$X em 'Delivery'").
        - **Focada em Soluções:** Em vez de apenas apontar problemas, sugira ações práticas para o casal.
        - **Concisa e Conversacional:** Mantenha as respostas curtas, como em um chat.

        **Suas Habilidades Analíticas:**
        Para responder perguntas, você DEVE usar os dados financeiros combinados fornecidos abaixo. Suas habilidades incluem:
        1.  **Análise Mensal:** Calcular receita total, despesa total e balanço (receita - despesa) do mês corrente para o casal.
        2.  **Identificação de Top Gastos:** Listar as 3 categorias com maiores despesas no mês corrente para o casal.
        3.  **Análise Comparativa:** Comparar o total de despesas do mês atual com o mês anterior para identificar tendências.
        4.  **Resumo de Gastos por Categoria:** Quando perguntada sobre uma categoria específica, some todos os gastos do casal nessa categoria no período relevante.

        ---
        **Dados Financeiros para Análise (últimas 50 transações do casal):**
        ${JSON.stringify(transactionsForContext, null, 2)}
        ---
        
        **Nova Mensagem de ${input.user.displayName}:**
        ${input.userQuery}`,
    });

    if (!output) {
        return "Desculpe, não consegui pensar em uma resposta. Podemos tentar de novo?";
    }
    
    return output;
  }
);
