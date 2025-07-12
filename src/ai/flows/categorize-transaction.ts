'use server';

/**
 * @fileOverview An AI agent to categorize financial transactions based on their descriptions.
 *
 * - categorizeTransaction - A function that categorizes transactions.
 * - CategorizeTransactionInput - The input type for the categorizeTransaction function.
 * - CategorizeTransactionOutput - The return type for the categorizeTransaction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { transactionCategories } from '@/lib/types';


const CategorizeTransactionInputSchema = z.object({
  description: z.string().describe('The description of the transaction.'),
});
export type CategorizeTransactionInput = z.infer<typeof CategorizeTransactionInputSchema>;

const CategorizeTransactionOutputSchema = z.object({
  category: z.enum(transactionCategories).describe('The predicted category of the transaction.'),
});
export type CategorizeTransactionOutput = z.infer<typeof CategorizeTransactionOutputSchema>;

export async function categorizeTransaction(input: CategorizeTransactionInput): Promise<CategorizeTransactionOutput> {
  return categorizeTransactionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeTransactionPrompt',
  input: {schema: CategorizeTransactionInputSchema},
  output: {schema: CategorizeTransactionOutputSchema},
  prompt: `Você é um especialista em finanças pessoais. Você está ajudando a categorizar transações com base em sua descrição.

  As categorias possíveis são:
  {{#each categories}}
  - {{this}}
  {{/each}}

  Dada a seguinte descrição da transação, determine a categoria mais apropriada. Você DEVE escolher uma das categorias listadas acima. Se a descrição for "Netflix" ou "Spotify", a categoria deve ser "Assinaturas". Se for relacionado a comida em casa, "Supermercado". Se for comida fora, "Restaurante". Se for relacionado a um veículo, "Gasolina" ou "Transporte". Contas de casa como internet, luz, água, devem ser categorizadas como tal.

  Descrição: {{{description}}}
  Categoria:`,
  templateOptions: {
    // @ts-ignore
    categories: transactionCategories.join(', '),
  },
});

const categorizeTransactionFlow = ai.defineFlow(
  {
    name: 'categorizeTransactionFlow',
    inputSchema: CategorizeTransactionInputSchema,
    outputSchema: CategorizeTransactionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
