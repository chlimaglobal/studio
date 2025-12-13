
'use server';

import { ai } from '@/ai/genkit';
import { GenerateFinancialAnalysisInputSchema, GenerateFinancialAnalysisOutputSchema } from '@/lib/definitions';
import { z } from 'zod';
import { LUMINA_DIAGNOSTIC_PROMPT } from '@/ai/lumina/prompt/luminaBasePrompt';
import { googleAI } from '@genkit-ai/google-genai';

export const generateFinancialAnalysis = ai.defineFlow(
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

    const result = await ai.generate({
        model: googleAI.model('gemini-1.5-flash'),
        prompt: prompt,
        output: {
            format: 'json',
            schema: GenerateFinancialAnalysisOutputSchema,
        }
    });

    const output = result.output;
    if (!output) {
      throw new Error('A Lúmina não conseguiu gerar a análise financeira.');
    }
    return output;
  }
);
