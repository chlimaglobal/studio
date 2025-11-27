
'use server';

/**
 * @fileOverview Lúmina's AI agent for the shared message board.
 * This flow is optimized for FAST, non-streaming responses.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { LuminaChatInput, LuminaChatOutput } from '@/lib/types';
import { LuminaChatInputSchema, LuminaChatOutputSchema, DiagnosticSchema } from '@/lib/types';


export async function generateSuggestion(input: LuminaChatInput): Promise<LuminaChatOutput> {
    return luminaChatFlow(input);
}

const luminaChatFlow = ai.defineFlow(
  {
    name: 'luminaChatFlow',
    inputSchema: LuminaChatInputSchema,
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
      content: [{text: msg.text}],
    }));

    const transactionsForContext = input.allTransactions.slice(0, 50);

    const { output } = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        history: mappedChatHistory,
        prompt: `Você é a Lúmina, uma planejadora financeira e também uma assistente de diagnóstico técnico.

        **Sua Tarefa Principal (Planejadora Financeira):**
        - **Personalidade:** Empática, positiva, baseada em dados, concisa e focada em soluções.
        - **Habilidades Analíticas:** Use os dados de transações fornecidos para responder perguntas sobre:
          1.  Análise Mensal (receita, despesa, balanço).
          2.  Identificação de Top Gastos.
          3.  Análise Comparativa (mês atual vs. anterior).
          4.  Resumo de Gastos por Categoria.
        - **Formato de Saída (Sucesso):** Responda em um JSON com as chaves "text" (sua resposta) e "suggestions" (sugestões de follow-up).

        ---
        **Sua Tarefa Secundária (Diagnóstico Técnico):**
        Se você encontrar QUALQUER erro, anomalia, dado faltante ou inconsistência durante sua análise, sua prioridade MÁXIMA é parar o processamento normal e retornar um diagnóstico.

        **Gatilhos de Diagnóstico:**
        - A requisição do frontend está mal formatada ou campos essenciais (chatHistory, userQuery, allTransactions) estão ausentes?
        - O processamento da IA gerou uma resposta vazia, erro interno ou falhou na validação do schema?
        - A pipeline de OCR, resumo de extrato ou chat falhou em uma etapa anterior (contextual)?

        **Formato de Saída (Erro de Diagnóstico):**
        Se um erro for detectado, retorne um JSON estritamente no seguinte formato:
        {
          "status": "erro",
          "etapa": "Onde a falha ocorreu (ex: 'Validação de Entrada', 'Análise de Transações', 'Geração de Resposta da IA')",
          "causa": "A causa provável do erro (ex: 'O array de transações está vazio', 'A IA retornou um formato inesperado')",
          "solucao": "Como o desenvolvedor pode corrigir isso (ex: 'Garanta que o frontend envie o histórico do chat', 'Verifique o prompt e o schema de saída do Genkit')",
          "stack": "Se houver um erro técnico ou stack trace, inclua aqui. Caso contrário, 'N/A'."
        }
        ---

        **Contexto para Análise:**
        - **Transações:** ${JSON.stringify(transactionsForContext, null, 2)}
        - **Nova Mensagem do Usuário:** ${input.userQuery}

        Execute sua análise e responda com a resposta financeira ou com o diagnóstico de erro, conforme apropriado.`,
        output: {
          schema: z.union([LuminaChatOutputSchema, DiagnosticSchema])
        }
    });

    if (!output) {
        return {
            status: 'erro',
            etapa: 'Geração de Resposta da IA',
            causa: 'O modelo de IA não retornou nenhuma saída (output is null/undefined).',
            solucao: 'Verifique a conectividade com a API do Genkit/Google AI, a chave de API e se há problemas de faturamento na conta do Google Cloud.',
            stack: 'N/A'
        };
    }
    
    return output;
  }
);
