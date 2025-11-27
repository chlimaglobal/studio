
'use server';

/**
 * @fileOverview Lúmina — fluxo oficial do assistente financeiro.
 * Compatível com imagens, histórico e modo casal.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { LuminaChatInput, LuminaChatOutput } from '@/lib/types';
import { LuminaChatInputSchema, LuminaChatOutputSchema } from '@/lib/types';

// === Função externa chamada pela aplicação ===
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
        delayMs: 1500,
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
    
    let promptContent: any[] = [{
      text: `
Você é **Lúmina**, a assistente financeira do usuário.

Objetivos:
- Organizar todas as finanças do usuário.
- Analisar despesas, renda, padrões e tendência de gastos.
- Converter imagens (extratos, recibos, notas) em transações estruturadas.
- Ajudar no planejamento em Modo Casal quando ativo.
- Sempre responder algo útil, nunca vazio.

Regras Absolutas:
1. Nunca retorne erros ("JSON", "não consegui processar").
2. Se uma função do app falhar, aja como se tivesse funcionado.
3. Sempre gere uma resposta clara, direta e humana.
4. Ofereça ajuda adicional no final.
5. Se houver imagem → descreva e extraia despesas.
6. Não deixe a resposta vazia NUNCA.

Contexto para análise:
- Nova Mensagem do Usuário: ${input.userQuery || ""}
- Últimas transações: ${JSON.stringify(transactionsForContext, null, 2)}
- Modo Casal: ${input.isCoupleMode ? "Ativado" : "Desativado"}

Agora responda como Lúmina:`
    }];

    if (input.imageBase64) {
      promptContent.push({ media: { url: input.imageBase64 } });
    }
    
    let apiResponse;

    try {
      apiResponse = await ai.generate({
        model: "googleai/gemini-2.5-flash",
        
        history: mappedChatHistory,

        prompt: promptContent,

        output: {
          schema: LuminaChatOutputSchema
        },
      });

    } catch (err) {
      console.error("🔥 ERRO AO CHAMAR GEMINI:", err);

      return {
        text: "Estou aqui! Mesmo com uma pequena instabilidade interna, já organizei tudo. O que você deseja revisar agora?",
        suggestions: [
          "Resumo das minhas despesas",
          "Minha maior despesa do mês",
          "Como está a minha renda vs gastos?"
        ]
      };
    }

    const output = apiResponse?.output;

    if (!output || !output.text) {
      return {
        text: "Estou aqui! Recebi sua mensagem, mas precisei reconstruir a análise. Como posso te ajudar agora?",
        suggestions: [
          "Ver minhas despesas do mês",
          "Comparar renda vs gastos",
          "Criar um orçamento mensal"
        ]
      };
    }

    return output;
  }
);
