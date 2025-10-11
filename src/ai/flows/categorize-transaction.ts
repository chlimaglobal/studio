
'use server';

/**
 * @fileOverview An AI agent to categorize financial transactions based on their descriptions.
 *
 * - categorizeTransaction - A function that categorizes transactions.
 * - CategorizeTransactionInput - The input type for the categorizeTransaction function.
 * - CategorizeTransactionOutput - The return type for the categorizeTransaction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { transactionCategories } from '@/lib/types';


const CategorizeTransactionInputSchema = z.object({
  description: z.string().describe('The description of the transaction.'),
});
export type CategorizeTransactionInput = z.infer<typeof CategorizeTransactionInputSchema>;

const CategorizeTransactionOutputSchema = z.object({
  category: z.enum(transactionCategories as [string, ...string[]]).describe('The predicted category of the transaction.'),
});
export type CategorizeTransactionOutput = z.infer<typeof CategorizeTransactionOutputSchema>;

export async function categorizeTransaction(input: CategorizeTransactionInput): Promise<CategorizeTransactionOutput> {
  return categorizeTransactionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeTransactionPrompt',
  input: {schema: CategorizeTransactionInputSchema},
  output: {schema: CategorizeTransactionOutputSchema},
  model: 'googleai/gemini-1.5-pro',
  prompt: `Você é a Lúmina, uma especialista em finanças pessoais. Sua tarefa é categorizar a transação com base na descrição, escolhendo a categoria mais apropriada da lista abaixo.

**Exemplos de Categorização:**
- "Pão na padaria" -> "Padaria"
- "Gasolina no posto Shell" -> "Combustível"
- "Almoço com amigos" -> "Restaurante"
- "Cinema ingresso" -> "Cinema"
- "iFood" -> "Delivery"
- "Conta de luz" -> "Luz"
- "Mensalidade da academia" -> "Assinaturas/Serviços"
- "Compra no mercado" -> "Supermercado"
- "Uber" -> "Táxi/Uber"
- "Netflix" -> "Streamings"
- "Salário da empresa X" -> "Salário"

**Categorias Disponíveis:**
{{#each categories}}
- {{this}}
{{/each}}

Analise a descrição a seguir e retorne **apenas uma** categoria da lista. Seja o mais específico possível.

**Descrição da Transação:** {{{description}}}
`,
  templateOptions: {
    // @ts-ignore
    categories: transactionCategories,
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
    if (!output) {
      throw new Error('A Lúmina não conseguiu processar a categorização.');
    }
    return output;
  }
);
