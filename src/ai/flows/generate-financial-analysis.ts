
'use server';

/**
 * @fileOverview An AI agent to analyze financial transactions and provide insights.
 *
 * - generateFinancialAnalysis - A function that generates a financial health diagnosis.
 * - GenerateFinancialAnalysisInput - The input type for the function.
 * - GenerateFinancialAnalysisOutput - The return type for the function.
 */

import { defineFlow, definePrompt } from 'genkit/flow';
import { Transaction } from '@/lib/types';
import { z } from 'zod';
import { LUMINA_DIAGNOSTIC_PROMPT } from '@/ai/lumina/prompt/luminaBasePrompt';
import { googleAI } from '@genkit-ai/google-genai';

const GenerateFinancialAnalysisInputSchema = z.object({
  transactions: z.array(z.any()).describe('A lista de transações do usuário (receitas e despesas).'),
});
export type GenerateFinancialAnalysisInput = z.infer<typeof GenerateFinancialAnalysisInputSchema>;

const TrendAnalysisSchema = z.object({
  trendDescription: z.string().describe('Uma descrição textual da tendência de gastos do mês atual em comparação com a média dos últimos 3 meses.'),
  topChangingCategories: z.array(z.object({
    category: z.string().describe('A categoria de despesa.'),
    changePercentage: z.number().describe('A mudança percentual no gasto em comparação com a média.'),
    currentMonthSpending: z.number().describe('O gasto total na categoria no mês atual.'),
  })).describe('Uma lista das 3 categorias com as maiores mudanças percentuais (positivas ou negativas).')
}).optional();


const GenerateFinancialAnalysisOutputSchema = z.object({
  healthStatus: z.enum(['Saudável', 'Atenção', 'Crítico']).describe('A pontuação geral da saúde financeira do usuário.'),
  diagnosis: z.string().describe('Um diagnóstico textual curto e amigável sobre a saúde financeira do usuário, explicando o status.'),
  suggestions: z.array(z.string()).describe('Uma lista de 2 a 4 dicas de economia acionáveis e personalizadas com base nos gastos.'),
  trendAnalysis: TrendAnalysisSchema.describe('Uma análise das tendências de gastos do usuário ao longo do tempo.').optional(),
});
export type GenerateFinancialAnalysisOutput = z.infer<typeof GenerateFinancialAnalysisOutputSchema>;

const generateFinancialAnalysisPrompt = definePrompt(
  {
    name: 'generateFinancialAnalysisPrompt',
    inputSchema: GenerateFinancialAnalysisInputSchema,
    outputSchema: GenerateFinancialAnalysisOutputSchema,
    model: googleAI.model('gemini-1.5-flash'),
    prompt: LUMINA_DIAGNOSTIC_PROMPT + `
  
  ---
  **Dados das Transações do Usuário para Análise:**
  {{{json transactions}}}

  Analise os dados e retorne o resultado no formato JSON solicitado, preenchendo todas as partes do schema de saída.`,
  },
  async (input) => {
     const llmResponse = await googleAI.model('gemini-1.5-flash').generate({
      prompt: input.prompt,
      output: { schema: GenerateFinancialAnalysisOutputSchema },
    });
    return llmResponse.output() as z.infer<typeof GenerateFinancialAnalysisOutputSchema>;
  }
);


export const generateFinancialAnalysisFlow = defineFlow(
  {
    name: 'generateFinancialAnalysisFlow',
    inputSchema: GenerateFinancialAnalysisInputSchema,
    outputSchema: GenerateFinancialAnalysisOutputSchema,
  },
  async (input) => {
    if (!input.transactions || input.transactions.length === 0) {
        return {
            healthStatus: 'Atenção',
            diagnosis: 'Ainda não há transações suficientes para uma análise detalhada. Comece a registrar seus gastos e receitas!',
            suggestions: [
                'Adicione sua primeira despesa usando o botão "+".',
                'Conecte o WhatsApp para registrar gastos por lá.',
                'Defina um orçamento para suas principais categorias.'
            ],
            trendAnalysis: undefined,
        }
    }
    const result = await generateFinancialAnalysisPrompt.generate({ input: input });
    const output = result.output();

    if (!output) {
      throw new Error('A Lúmina não conseguiu gerar a análise financeira.');
    }
    return output;
  }
);

export async function generateFinancialAnalysis(input: { transactions: Transaction[] }): Promise<GenerateFinancialAnalysisOutput> {
  const simplifiedTransactions = input.transactions.map(t => ({
      type: t.type,
      amount: t.amount,
      category: t.category,
      description: t.description,
      date: t.date, // Include date for trend analysis
  }));

  // @ts-ignore
  return generateFinancialAnalysisFlow({ transactions: simplifiedTransactions });
}
