
'use server';

/**
 * @fileOverview Lúmina — fluxo oficial do assistente financeiro.
 * Compatível com imagens, histórico e modo casal.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { LuminaChatInput, LuminaChatOutput } from '@/lib/types';
import { LuminaChatInputSchema, LuminaChatOutputSchema } from '@/lib/types';
import { LUMINA_BASE_PROMPT } from '@/ai/lumina/prompt/luminaBasePrompt';

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
    // ================================================================
    // 🔥 1. PREPARAÇÃO DOS DADOS DE ENTRADA
    // ================================================================
    const mappedChatHistory = input.chatHistory.map(msg => ({
      role: msg.role === 'lumina' ? 'model' : 'user',
      content: [
          { text: msg.text || '' }
      ]
    }));

    const transactionsForContext = input.allTransactions.slice(0, 30);

    const prompt_context = `
      - Transações: ${JSON.stringify(transactionsForContext, null, 2)}
      - Query: ${input.userQuery || ""}
      - Modo Casal: ${input.isCoupleMode ? "Ativado" : "Desativado"}
      - Áudio Transcrito: ${input.audioText || 'N/A'}
    `;

    // ================================================================
    // 🔥 2. CHAMADA PARA O GEMINI
    // ================================================================
    let apiResponse;

    try {
      const model = 'googleai/gemini-2.5-flash';
      
      const history = [
        { role: 'user', content: [{ text: LUMINA_BASE_PROMPT }] },
        { role: 'model', content: [{ text: "Entendido. Estou pronta para ajudar." }] },
        ...mappedChatHistory,
      ]

      apiResponse = await ai.generate({
        model,
        prompt: input.userQuery || '',
        history,
        attachments: input.imageBase64
          ? [ {
                media: { url: input.imageBase64 },
             } ]
          : undefined,
        output: {
          schema: LuminaChatOutputSchema,
        },
      });


    } catch (err) {
      console.error("🔥 ERRO AO CHAMAR GEMINI:", err);
      // Fallback de erro
      return {
        text: "Tive uma pequena instabilidade, mas já recuperei tudo. Como posso te ajudar agora?",
        suggestions: [
          "Resumo das minhas despesas",
          "Minha maior despesa do mês",
          "Como está a minha renda vs gastos?"
        ]
      };
    }
    
    // ================================================================
    // 🔥 3. TRATAMENTO DA RESPOSTA
    // ================================================================
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
