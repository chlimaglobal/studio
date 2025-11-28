
'use server';

/**
 * @fileOverview An AI agent to analyze financial transactions and provide insights.
 *
 * - generateFinancialAnalysis - A function that generates a financial health diagnosis.
 * - GenerateFinancialAnalysisInput - The input type for the function.
 * - GenerateFinancialAnalysisOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { Transaction } from '@/lib/types';
import { z } from 'genkit';
import { endOfISOWeek } from 'date-fns';
import { LUMINA_DIAGNOSTIC_PROMPT } from '@/ai/lumina/prompt/luminaBasePrompt';

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

const prompt = ai.definePrompt({
  name: 'generateFinancialAnalysisPrompt',
  input: { schema: GenerateFinancialAnalysisInputSchema },
  output: { schema: GenerateFinancialAnalysisOutputSchema },
  model: 'googleai/gemini-2.5-flash',
  prompt: LUMINA_DIAGNOSTIC_PROMPT + `
  
  ---
  **Dados das Transações do Usuário para Análise:**
  {{{json transactions}}}

  Analise os dados e retorne o resultado no formato JSON solicitado, preenchendo todas as partes do schema de saída.`,
});

const generateFinancialAnalysisFlow = ai.defineFlow(
  {
    name: 'generateFinancialAnalysisFlow',
    inputSchema: GenerateFinancialAnalysisInputSchema,
    outputSchema: GenerateFinancialAnalysisOutputSchema,
    retrier: {
      maxAttempts: 3,
      backoff: {
        delayMs: 2000,
        multiplier: 2,
      },
    },
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

    const { output } = await prompt(input);
    if (!output) {
      throw new Error('A Lúmina não conseguiu gerar a análise financeira.');
    }
    return output;
  }
);
