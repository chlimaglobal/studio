
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
    // ================================================================
    // 🔥 1. PREPARAÇÃO DOS DADOS DE ENTRADA
    // ================================================================
    const mappedChatHistory = input.chatHistory.map(msg => ({
      role: msg.role === 'lumina' ? 'model' : ('user' as 'user' | 'model'),
      content: [{ text: msg.text || '' }]
    }));

    const transactionsForContext = input.allTransactions.slice(0, 30);

    const promptText = `Você é Lúmina, uma assistente financeira. Analise a query do usuário e o histórico de transações para fornecer uma resposta útil e sugestões.
      
      Transações: ${JSON.stringify(transactionsForContext, null, 2)}
      Query: ${input.userQuery || ""}
      Modo Casal: ${input.isCoupleMode ? "Ativado" : "Desativado"}
      Áudio Transcrito: ${input.audioText || 'N/A'}
      `;

    // ================================================================
    // 🔥 2. CHAMADA PARA O GEMINI
    // ================================================================
    let apiResponse;

    try {
      const model = ai.getModel("googleai/gemini-2.5-flash");
      
      apiResponse = await ai.generate({
        model,
        prompt: promptText,
        history: mappedChatHistory,
        attachments: input.imageBase64 ? [{ data: input.imageBase64, mimeType: 'image/jpeg' }] : undefined,
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
