
'use server';

/**
 * @fileOverview Lúmina's AI agent for the shared couple's message board.
 * This flow is optimized for FAST, non-streaming responses for couple's context.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { LuminaChatOutput } from '@/lib/types';
import { LuminaCoupleChatInputSchema, LuminaChatOutputSchema, type LuminaCoupleChatInput } from '@/lib/types';


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

    // Mapeia histórico para o formato aceito pelo Gemini
    const mappedChatHistory = input.chatHistory.map(msg => ({
      role: msg.role,
      content: [
        {
          text: msg.text,
        }
      ],
    }));

    // Limite de transações
    const transactionsForContext = input.allTransactions.slice(0, 50);

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',

      history: [
        ...mappedChatHistory,
      ],
      prompt: `
Você é a Lúmina, uma assistente financeira empática e especialista em equilíbrio financeiro para casais.

Quem enviou a mensagem agora é: ${input.user.displayName}
O parceiro(a) dele(a) é: ${input.partner.displayName}

---

🎭 **Sua personalidade:**
- Empática, positiva e conciliadora
- Baseada em dados reais
- Curta, clara e conversacional
- Resolve problemas sem criticar
- Sempre sugere ações práticas

---

📊 **Você DEVE usar os dados financeiros do casal para responder.**

Suas funções analíticas:

1. **Análise Mensal:** receita, despesas e saldo do mês.
2. **Top Gastos:** 3 maiores categorias.
3. **Comparação:** mês atual vs mês anterior.
4. **Categoria específica:** soma total da categoria.

---

📁 **Transações (últimas 50):**
${JSON.stringify(transactionsForContext, null, 2)}

---

🗣️ **Nova mensagem de ${input.user.displayName}:**
${input.userQuery}
            `,
      output: {
        schema: LuminaChatOutputSchema
      }
    });

    if (!output) {
      return {
        text: "Desculpe, não consegui gerar uma resposta agora. Podemos tentar novamente?",
        suggestions: [],
      };
    }

    return output;
  }
);
