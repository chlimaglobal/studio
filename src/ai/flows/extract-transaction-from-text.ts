'use server';

/**
 * @fileOverview Um agente de IA para extrair informações de transações de texto em linguagem natural.
 *
 * - extractTransactionFromText - Uma função que extrai dados de transação de uma string.
 * - ExtractTransactionInput - O tipo de entrada para a função extractTransactionFromText.
 * - ExtractTransactionOutput - O tipo de retorno para a função extractTransactionFromText.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { TransactionCategory, transactionCategories } from '@/lib/types';

const ExtractTransactionInputSchema = z.object({
  text: z.string().describe('O texto em linguagem natural fornecido pelo usuário sobre uma transação.'),
});
export type ExtractTransactionInput = z.infer<typeof ExtractTransactionInputSchema>;

const ExtractTransactionOutputSchema = z.object({
  description: z.string().describe('Uma descrição concisa da transação.'),
  amount: z.number().describe('O valor numérico da transação.'),
  type: z.enum(['income', 'expense']).describe('O tipo da transação (receita ou despesa).'),
  category: z.enum(transactionCategories).optional().describe('A categoria sugerida para a transação.'),
});
export type ExtractTransactionOutput = z.infer<typeof ExtractTransactionOutputSchema>;

export async function extractTransactionFromText(input: ExtractTransactionInput): Promise<ExtractTransactionOutput> {
  return extractTransactionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTransactionPrompt',
  input: { schema: ExtractTransactionInputSchema },
  output: { schema: ExtractTransactionOutputSchema },
  prompt: `Você é um assistente financeiro especialista em interpretar texto de linguagem natural para extrair detalhes de transações.
  Sua tarefa é analisar o texto do usuário e extrair a descrição, o valor e o tipo de transação (receita ou despesa).
  Se o usuário disser "gastei", "comprei", "paguei", etc., o tipo é 'expense'.
  Se o usuário disser "recebi", "ganhei", "vendi", etc., o tipo é 'income'.
  A descrição deve ser um resumo curto e objetivo do que foi a transação.
  O valor deve ser um número.

  Exemplo 1: "gastei 25 reais no almoço de hoje"
  Saída esperada: { description: "Almoço", amount: 25, type: "expense", category: "Restaurante" }

  Exemplo 2: "recebi 500 de comissão"
  Saída esperada: { description: "Comissão", amount: 500, type: "income", category: "Comissão" }

  Texto do usuário: {{{text}}}
  `,
});

const extractTransactionFlow = ai.defineFlow(
  {
    name: 'extractTransactionFlow',
    inputSchema: ExtractTransactionInputSchema,
    outputSchema: ExtractTransactionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
