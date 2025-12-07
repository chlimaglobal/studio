
'use server';

import { defineFlow } from 'genkit';
import { Transaction } from '@/lib/types';
import { z } from 'zod';
import { LUMINA_DIAGNOSTIC_PROMPT } from '@/ai/lumina/prompt/luminaBasePrompt';
import { googleAI } from '@genkit-ai/googleai';
import { generate } from 'genkit/ai';

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

export const generateFinancialAnalysis = defineFlow(
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
    
    const prompt = LUMINA_DIAGNOSTIC_PROMPT + `
  
      ---
      **Dados das Transações do Usuário para Análise:**
      ${JSON.stringify(input.transactions)}

      Analise os dados e retorne o resultado no formato JSON solicitado, preenchendo todas as partes do schema de saída.`;

    const result = await generate({
        model: googleAI('gemini-1.5-flash'),
        prompt: prompt,
        output: {
            format: 'json',
            schema: GenerateFinancialAnalysisOutputSchema,
        }
    });

    const output = result.output();
    if (!output) {
      throw new Error('A Lúmina não conseguiu gerar a análise financeira.');
    }
    return output;
  }
);
