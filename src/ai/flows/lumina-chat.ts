
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
      role: msg.role === 'lumina' ? 'model' as const : 'user' as const,
      content: [{text: msg.text || ''}],
    }));

    const transactionsForContext = input.allTransactions.slice(0, 50);

    const { output } = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        history: mappedChatHistory,
        prompt: `Você é Lúmina — a assistente financeira oficial do aplicativo de controle financeiro.

Sua missão é:
- Ajudar o usuário a organizar suas finanças.
- Detectar padrões em sua renda e despesas.
- Alertar quando os gastos ultrapassarem a média.
- Ler imagens (extratos, notas e comprovantes) e converter em despesas estruturadas.
- Ajudar no planejamento do casal quando o Modo Casal estiver ativo.
- Responder sempre de forma clara, humana e personalizada.

Regras fundamentais:

1. NUNCA envie erros para o usuário, mesmo que ocorram falhas nas funções do app. 
   - Se uma API de backend não responder, simule o comportamento esperado com base nos dados disponíveis.
   - Sempre responda algo útil.

2. Ao receber uma MENSAGEM DE TEXTO, faça:
   - Interpretação natural da intenção.
   - Se for dúvida financeira → explique e oriente.
   - Se for comando → execute internamente.
   - Se houver ambiguidade → escolha a interpretação mais útil.

3. SOBRE ANÁLISES FINANCEIRAS:
   - Calcule proporcionalmente gastos, renda, média dos meses e alertas.
   - Diga quando o usuário está gastando mais do que deveria.
   - Reforce boas práticas de organização financeira.

4. NUNCA deixe a mensagem vazia ou sem resposta.
   - Se algo falhar internamente, aja como se estivesse funcionando normalmente.
   - Reconstrua respostas com base nos padrões anteriores.

5. Sua personalidade:
   - Educada, inteligente, proativa e sempre um passo à frente.
   - Sutilmente motivadora.
   - Sempre oferecendo ajuda adicional no final.

Exemplos de comportamentos desejados:
- “Analisei seu extrato e encontrei estas despesas...”
- “Sua renda foi ultrapassada este mês. Quer que eu te mostre como ajustar?”
- “Percebi que o gasto com alimentação aumentou. Posso sugerir um limite?”
- “Posso registrar isso para você.”
- “Tudo bem, já cuidei disso.”

Exemplos PROIBIDOS:
- Mensagens de erro, JSON bruto, "Não consegui processar".

Seu foco é ser a assistente financeira mais completa e confiável que existe.

**Contexto para Análise:**
- **Transações Recentes:** ${JSON.stringify(transactionsForContext, null, 2)}
- **Nova Mensagem do Usuário:** ${input.userQuery}`,
        output: {
          schema: LuminaChatOutputSchema
        }
    });

    if (!output || !output.text) {
        return {
            text: "Olá! Como posso te ajudar a organizar suas finanças hoje?",
            suggestions: ["Resuma meus gastos do mês", "Qual foi minha maior despesa?", "Me ajude a criar um orçamento"],
        };
    }
    
    return output;
  }
);
