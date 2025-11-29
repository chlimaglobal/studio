
'use server';

/**
 * @fileOverview Um agente de IA para calcular uma meta de economia mensal inteligente.
 *
 * - calculateSavingsGoal - Uma função que analisa as finanças e propõe uma meta.
 * - SavingsGoalInput - O tipo de entrada para a função.
 * - SavingsGoalOutput - O tipo de retorno para a função.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Transaction } from '@/lib/types';
import { LUMINA_GOALS_SYSTEM_PROMPT } from '@/ai/lumina/prompt/luminaGoalsPrompt';

// Schema de Entrada
export const SavingsGoalInputSchema = z.object({
  transactions: z.array(z.any()).describe('Lista de transações dos últimos 30-90 dias.'),
});
export type SavingsGoalInput = z.infer<typeof SavingsGoalInputSchema>;

// Schema de Saída
export const SavingsGoalOutputSchema = z.object({
  monthlyIncome: z.number().describe('Renda mensal total calculada.'),
  currentExpenses: z.number().describe('Soma total dos gastos mensais.'),
  savingCapacity: z.number().describe('Capacidade real de economia (renda - gastos).'),
  recommendedGoal: z.number().describe('A meta de economia mensal recomendada em valor monetário.'),
  recommendedPercentage: z.number().describe('A porcentagem da renda que a meta recomendada representa.'),
});
export type SavingsGoalOutput = z.infer<typeof SavingsGoalOutputSchema>;


export async function calculateSavingsGoal(input: SavingsGoalInput): Promise<SavingsGoalOutput> {
  return calculateSavingsGoalFlow(input);
}

const prompt = ai.definePrompt({
  name: 'calculateSavingsGoalPrompt',
  input: { schema: SavingsGoalInputSchema },
  output: { schema: SavingsGoalOutputSchema },
  model: 'googleai/gemini-2.5-flash',
  prompt: LUMINA_GOALS_SYSTEM_PROMPT + `
  
  ---
  **Dados das Transações do Usuário para Análise:**
  {{{json transactions}}}

  Analise os dados, siga as regras definidas e retorne o resultado no formato JSON solicitado, preenchendo todos os campos do schema de saída.`,
});

const calculateSavingsGoalFlow = ai.defineFlow(
  {
    name: 'calculateSavingsGoalFlow',
    inputSchema: SavingsGoalInputSchema,
    outputSchema: SavingsGoalOutputSchema,
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
        throw new Error('Não há transações suficientes para calcular uma meta.');
    }
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('A Lúmina não conseguiu calcular a meta de economia.');
    }
    return output;
  }
);
