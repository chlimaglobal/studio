
'use server';

/**
 * @fileOverview An AI agent to categorize financial transactions based on their descriptions.
 *
 * - categorizeTransaction - A function that categorizes transactions.
 * - CategorizeTransactionInput - The input type for the categorizeTransaction function.
 * - CategorizeTransactionOutput - The return type for the categorizeTransaction function.
 */

import { defineFlow, definePrompt } from 'genkit/flow';
import {
  transactionCategories,
  CategorizeTransactionInputSchema,
  CategorizeTransactionOutputSchema,
  type CategorizeTransactionInput,
  type CategorizeTransactionOutput,
} from '@/lib/types';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';

const categorizeTransactionPrompt = definePrompt(
  {
    name: 'categorizeTransactionPrompt',
    inputSchema: CategorizeTransactionInputSchema,
    outputSchema: CategorizeTransactionOutputSchema,
    model: googleAI.model('gemini-1.5-flash'),
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
    template: {
      variables: {},
      // @ts-ignore
      context: {
        categories: transactionCategories,
      }
    }
  },
  async (input) => {
    const llmResponse = await googleAI.model('gemini-1.5-flash').generate({
      prompt: input.prompt,
      output: { schema: CategorizeTransactionOutputSchema },
    });
    return llmResponse.output() as z.infer<typeof CategorizeTransactionOutputSchema>;
  }
);


export const categorizeTransactionFlow = defineFlow(
  {
    name: 'categorizeTransactionFlow',
    inputSchema: CategorizeTransactionInputSchema,
    outputSchema: CategorizeTransactionOutputSchema,
  },
  async (input) => {
    const result = await categorizeTransactionPrompt.generate({
      input: input,
    });

    const output = result.output();
    if (!output) {
      throw new Error('A Lúmina não conseguiu processar a categorização.');
    }
    return output;
  }
);


export async function categorizeTransaction(input: CategorizeTransactionInput): Promise<CategorizeTransactionOutput> {
  return categorizeTransactionFlow(input);
}
