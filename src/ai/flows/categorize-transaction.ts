
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
  prompt: `Você é um especialista em finanças pessoais. Sua tarefa é categorizar transações com base na descrição fornecida, escolhendo a categoria mais apropriada da lista abaixo.

  **Categorias Disponíveis:**
  {{#each categories}}
  - {{this}}
  {{/each}}

  **Instruções de Categorização:**
  - **Alimentação:** Compras de comida em geral, não em restaurantes. Se for "mercado" ou "supermercado", use "Supermercado".
  - **Assinaturas:** Serviços recorrentes como academias (Smart Fit, etc.), jornais, revistas, etc. Não inclua serviços de streaming aqui.
  - **Contas:** Contas gerais da casa. Use categorias mais específicas se possível.
  - **Luz, Água, Internet, Telefone:** Use estas categorias para as respectivas contas de utilidades.
  - **Restaurante:** Comida fora de casa, iFood, Uber Eats, lanches.
  - **Transporte:** Uber, 99, ônibus, metrô. Se for relacionado a carro próprio, use "Gasolina" ou "Manutenção Veicular".
  - **Saúde:** Farmácia, médico, plano de saúde.
  - **Entretenimento:** Cinema, shows, passeios, e serviços de streaming como Netflix, Spotify, Amazon Prime, HBO Max, Disney+.
  - **Educação:** Cursos, livros, material escolar.
  - **Salário, Bônus, Comissão:** Para diferentes tipos de renda.

  Analise a descrição a seguir e retorne **apenas uma** das categorias da lista.

  **Descrição da Transação:** {{{description}}}
  **Categoria Prevista:**`,
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
    return output!;
  }
);
