
'use server';

/**
 * @fileOverview An AI agent to extract transaction information from an image.
 *
 * - extractFromImage - A function that extracts transaction data from an image.
 * - ExtractFromImageInput - The input type for the function.
 * - ExtractFromImageOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { transactionCategories, ExtractFromImageInputSchema, ExtractFromImageOutputSchema, type ExtractFromImageInput, type ExtractFromImageOutput } from '@/lib/types';


export async function extractFromImage(input: ExtractFromImageInput): Promise<ExtractFromImageOutput> {
  return extractFromImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractFromImagePrompt',
  input: { schema: ExtractFromImageInputSchema },
  output: { schema: ExtractFromImageOutputSchema },
  model: 'googleai/gemini-2.5-flash',
  prompt: `Você é a Lúmina, uma assistente financeira especialista em interpretar imagens (extratos, faturas, comprovantes). Sua tarefa é extrair os dados e NUNCA falhar.

  **Sua Missão:**
  1.  **Extraia os Dados:** Analise a imagem para obter: descrição, valor total, tipo e parcelamento.
  2.  **Seja Resiliente:** Se um dado estiver faltando, infira o valor mais lógico.
      -   Se o valor não for claro, mas houver uma descrição, extraia a descrição e defina o valor como 0.
      -   Se o tipo não for claro, assuma 'expense' (despesa).
      -   Se a categoria não for clara, use 'Outros'.
      -   Se o parcelamento não for mencionado, use 'one-time'.
  3.  **Retorne um JSON Válido, SEMPRE:** Sua resposta DEVE ser um JSON no formato solicitado, mesmo que alguns campos sejam preenchidos com valores padrão devido a dados ausentes.
  4.  **Cálculo de Parcelas:** Se a imagem mostrar "10x de R$27,17", o valor a ser extraído é o TOTAL (271,70), 'paymentMethod' é 'installments' e 'installments' é "10".

  **Categorias Disponíveis:**
  {{#each categories}}
  - {{this}}
  {{/each}}

  **Exemplos de Resiliência:**
  - **Imagem com "Restaurante Sabor Divino" mas valor borrado:**
    **Saída Esperada:** { "description": "Restaurante Sabor Divino", "amount": 0, "type": "expense", "category": "Restaurante", "paymentMethod": "one-time" }
  - **Imagem com anotação "Recebi do freela" mas sem valor:**
    **Saída Esperada:** { "description": "Recebimento de freela", "amount": 0, "type": "income", "category": "Outros", "paymentMethod": "one-time" }


  **Imagem para Análise:**
  {{media url=imageDataUri}}

  Analise a imagem, siga as regras de resiliência e retorne um JSON válido.`,
  templateOptions: {
    // @ts-ignore
    categories: transactionCategories,
  },
});

const extractFromImageFlow = ai.defineFlow(
  {
    name: 'extractFromImageFlow',
    inputSchema: ExtractFromImageInputSchema,
    outputSchema: ExtractFromImageOutputSchema,
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
    if (!output) {
      // Fallback in case the model returns absolutely nothing
      return {
        description: 'Não foi possível ler a imagem',
        amount: 0,
        type: 'expense',
        category: 'Outros',
        paymentMethod: 'one-time',
      }
    }
    return output;
  }
);
