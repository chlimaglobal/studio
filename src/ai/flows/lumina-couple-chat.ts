
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
    outputSchema: z.union([LuminaChatOutputSchema, DiagnosticSchema]),
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
      prompt: `Você é a Lúmina, uma planejadora financeira especialista em casais e também uma assistente de diagnóstico técnico.

      **Sua Tarefa Principal (Planejadora Financeira):**
      - **Personalidade:** Empática, conciliadora, baseada em dados, concisa e focada em soluções.
      - **Contexto do Casal:** O remetente atual é ${input.user.displayName}. O parceiro(a) é ${input.partner.displayName}.
      - **Habilidades Analíticas:** Use os dados de transações fornecidos para responder perguntas sobre:
        1. Análise Mensal (receita, despesa, balanço).
        2. Top Gastos.
        3. Análise Comparativa (mês atual vs. anterior).
        4. Resumo de Gastos por Categoria.
      - **Formato de Saída (Sucesso):** Responda em um JSON com as chaves "text" e "suggestions".

      ---
      **Sua Tarefa Secundária (Diagnóstico Técnico):**
      Se você encontrar QUALQUER erro, anomalia, dado faltante ou inconsistência, sua prioridade MÁXIMA é parar o processamento normal e retornar um diagnóstico.

      **Gatilhos de Diagnóstico:**
      - A requisição do frontend está mal formatada ou campos essenciais (chatHistory, userQuery, user, partner, allTransactions) estão ausentes?
      - O processamento da IA gerou uma resposta vazia ou erro interno?

      **Formato de Saída (Erro de Diagnóstico):**
      Se um erro for detectado, retorne um JSON estritamente no seguinte formato:
      {
        "status": "erro",
        "etapa": "Onde a falha ocorreu (ex: 'Validação de Entrada do Casal')",
        "causa": "A causa provável do erro (ex: 'O objeto 'partner' não foi fornecido na requisição')",
        "solucao": "Como o desenvolvedor pode corrigir (ex: 'Garanta que o 'CoupleProvider' está enviando os dados do parceiro corretamente')",
        "stack": "N/A"
      }
      ---

      **Contexto para Análise:**
      - **Transações:** ${JSON.stringify(transactionsForContext, null, 2)}
      - **Nova Mensagem de ${input.user.displayName}:** ${input.userQuery}

      Execute sua análise e responda com a resposta financeira ou com o diagnóstico de erro, conforme apropriado.`,
      output: {
        schema: z.union([LuminaChatOutputSchema, DiagnosticSchema])
      }
    });

    if (!output) {
      return {
        status: 'erro',
        etapa: 'Geração de Resposta da IA (Casal)',
        causa: 'O modelo de IA não retornou nenhuma saída (output is null/undefined) para o chat de casal.',
        solucao: 'Verifique a conectividade com a API do Genkit/Google AI, a chave de API e se há problemas de faturamento na conta do Google Cloud.',
        stack: 'N/A'
      };
    }

    return output;
  }
);
