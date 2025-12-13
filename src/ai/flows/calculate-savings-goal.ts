
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { SavingsGoalInputSchema, SavingsGoalOutputSchema } from '@/lib/definitions';
import { LUMINA_GOALS_SYSTEM_PROMPT } from '@/ai/lumina/prompt/luminaGoalsPrompt';
import { googleAI } from '@genkit-ai/google-genai';

export const calculateSavingsGoal = ai.defineFlow(
  {
    name: 'calculateSavingsGoalFlow',
    inputSchema: SavingsGoalInputSchema,
    outputSchema: SavingsGoalOutputSchema,
  },
  async (input) => {
    if (!input.transactions || input.transactions.length === 0) {
        throw new Error('Não há transações suficientes para calcular uma meta.');
    }
    
    const prompt = LUMINA_GOALS_SYSTEM_PROMPT + `
  
      ---
      **Dados das Transações do Usuário para Análise:**
      ${JSON.stringify(input.transactions)}

      Analise os dados, siga as regras definidas e retorne o resultado no formato JSON solicitado, preenchendo todos os campos do schema de saída.`;

    const result = await ai.generate({
        model: googleAI.model('gemini-1.5-flash'),
        prompt: prompt,
        config: {
          retries: 3,
        },
        output: {
            format: 'json',
            schema: SavingsGoalOutputSchema
        }
    });

    const output = result.output;
    if (!output) {
      throw new Error('A Lúmina não conseguiu calcular a meta de economia.');
    }
    return output;
  }
);
