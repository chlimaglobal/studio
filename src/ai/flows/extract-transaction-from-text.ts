
'use server';

/**
 * @fileOverview Um agente de IA para extrair informações de transações de texto em linguagem natural.
 *
 * - extractTransactionFromText - Uma função que extrai dados de transação de uma string.
 * - ExtractTransactionInput - O tipo de entrada para a função extractTransactionFromText.
 * - ExtractTransactionOutput - O tipo de retorno para a função extractTransactionFromText.
 */

import { ai } from '@/ai/genkit';
import {
  ExtractTransactionInputSchema,
  ExtractTransactionOutputSchema,
  type ExtractTransactionInput,
  type ExtractTransactionOutput,
} from '@/lib/types';


export async function extractTransactionFromText(input: ExtractTransactionInput): Promise<ExtractTransactionOutput> {
  return extractTransactionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTransactionPrompt',
  input: { schema: ExtractTransactionInputSchema },
  output: { schema: ExtractTransactionOutputSchema },
  model: 'googleai/gemini-2.5-flash',
  prompt: `Você é a Lúmina, uma assistente financeira especialista em interpretar texto. Sua tarefa é extrair detalhes de transações e NUNCA falhar.

  **Sua Missão:**
  1.  **Extraia os Dados:** Analise o texto para obter: descrição, valor, tipo e parcelamento.
  2.  **Seja Resiliente:** Se um dado estiver faltando, infira o valor mais lógico.
      -   Se o valor não for mencionado, extraia a descrição e defina o valor como 0.
      -   Se o tipo não for claro, assuma 'expense' (despesa).
  3.  **Retorne um JSON Válido, SEMPRE:** Sua resposta DEVE ser um JSON no formato solicitado, mesmo que alguns campos sejam preenchidos com valores padrão.
  4.  **Cálculo de Parcelas:** Se o usuário mencionar "em 10 vezes", "10x", etc., o valor deve ser o TOTAL da compra, 'paymentMethod' é 'installments' e 'installments' é "10".

  **Exemplos:**
  - **Texto:** "gastei 25 reais no almoço" -> **Saída:** { "description": "Almoço", "amount": 25, "type": "expense", "category": "Restaurante", "paymentMethod": "one-time" }
  - **Texto:** "paguei o spotify" -> **Saída:** { "description": "Spotify", "amount": 0, "type": "expense", "category": "Streamings", "paymentMethod": "one-time" }
  - **Texto:** "Comprei um celular novo por 3 mil reais em 10 vezes" -> **Saída:** { "description": "Celular novo", "amount": 3000, "type": "expense", "category": "Compras", "paymentMethod": "installments", "installments": "10" }

  **Texto do usuário para análise:**
  {{{text}}}
  `,
});

const extractTransactionFlow = ai.defineFlow(
  {
    name: 'extractTransactionFlow',
    inputSchema: ExtractTransactionInputSchema,
    outputSchema: ExtractTransactionOutputSchema,
     retrier: {
      maxAttempts: 3,
      backoff: {
        delayMs: 2000,
        multiplier: 2,
      },
    },
  },
  async (input) => {
    const { output } = await prompt(input);
    // Relaxed validation: only description and type are strictly required to proceed.
    // Amount can be zero if not detected, and category is optional.
    if (!output || !output.description || !output.type) {
       // Fallback in case the model returns absolutely nothing
      return {
        description: input.text,
        amount: 0,
        type: 'expense',
        category: 'Outros',
        paymentMethod: 'one-time',
      };
    }
    return output;
  }
);
