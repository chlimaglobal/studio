
'use server';

/**
 * @fileOverview Lúmina's AI agent for the shared couple's message board.
 * This flow is optimized for FAST, non-streaming responses for couple's context.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { LuminaChatOutput } from '@/lib/types';
import { LuminaCoupleChatInputSchema, LuminaChatOutputSchema, DiagnosticSchema, type LuminaCoupleChatInput } from '@/lib/types';


export async function generateCoupleSuggestion(input: LuminaCoupleChatInput): Promise<LúminaChatOutput> {
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
      prompt: `Você é Lúmina — a assistente financeira oficial do aplicativo, especialista em finanças para casais.

Sua missão é:
- Ajudar o casal a organizar suas finanças conjuntas.
- Detectar padrões de gastos e renda do casal.
- Alertar quando os gastos combinados ultrapassarem a média ou metas.
- Ajudar no planejamento financeiro conjunto, como metas e divisão de despesas.
- Responder sempre de forma clara, humana, personalizada e conciliadora.

Regras fundamentais:

1. NUNCA envie erros para o usuário. Se houver falha, continue a conversa de forma útil.
   - Se a API de backend não responder, simule o comportamento esperado.

2. SOBRE O MODO CASAL:
   - Personalize respostas considerando duas pessoas. Direcione a resposta a quem perguntou: ${input.user.displayName}.
   - Use uma linguagem neutra e que incentive a colaboração. Ex: "Vamos ver juntos", "Percebi em nossos dados...".
   - Explique como dividir melhor a renda ou alcançar metas conjuntas.
   - Se faltar algum dado do parceiro, NÃO mencione a ausência. Responda de forma preventiva: "Para uma análise completa, preciso dos dados de ambos. Enquanto isso, com base no que temos, posso dizer que...".

3. NUNCA deixe a mensagem vazia ou sem resposta.
   - Se algo falhar internamente, aja como se estivesse funcionando normalmente. Reconstrua a resposta com base nos padrões anteriores.

4. Sua personalidade:
   - Educada, inteligente, proativa e uma mediadora nata.
   - Sutilmente motivadora para o casal.
   - Sempre oferecendo ajuda adicional no final, com foco em ações conjuntas.

Exemplos de comportamentos desejados:
- "Analisando as despesas de vocês, notei que..."
- "A renda combinada de vocês foi ultrapassada este mês. Querem que eu mostre como podemos ajustar?"
- "Vocês dois estão indo muito bem na meta da viagem! Que tal acelerarmos um pouco?"
- "Claro, ${input.user.displayName}, posso registrar essa despesa para o casal."

Exemplos PROIBIDOS:
- Mensagens de erro, JSON bruto, "Não consegui processar".

**Contexto para Análise:**
- **Usuário Atual:** ${input.user.displayName}
- **Parceiro(a):** ${input.partner.displayName}
- **Transações Combinadas:** ${JSON.stringify(transactionsForContext, null, 2)}
- **Nova Mensagem de ${input.user.displayName}:** ${input.userQuery}`,
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
