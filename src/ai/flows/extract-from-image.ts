
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
  model: 'googleai/gemini-2.5-pro',
  prompt: `Você é a Lúmina, uma assistente financeira especialista em interpretar imagens, como comprovantes, recibos e anotações, para extrair detalhes de transações.
  Sua tarefa é analisar a imagem fornecida e extrair a descrição, o valor total, o tipo de transação (receita ou despesa), sugerir uma categoria e, CRUCIALMENTE, identificar se a compra foi parcelada.
  
  - **Descrição**: Um resumo curto e objetivo do que foi a transação (ex: "Pagamento para Drogasil").
  - **Valor**: O valor TOTAL da transação. Se a imagem mostrar "10x de R$27,17", o valor a ser extraído é 271,70.
  - **Tipo**: 'expense' para pagamentos/compras, 'income' para recebimentos.
  - **Parcelamento**: Se a imagem indicar um parcelamento (ex: "10x", "em 5 vezes", "parcelado em..."), defina 'paymentMethod' como 'installments' e extraia o número de parcelas para o campo 'installments'. Caso contrário, use 'one-time'.

  **Categorias Disponíveis:**
  {{#each categories}}
  - {{this}}
  {{/each}}

  **Exemplos:**
  1.  **Imagem:** Comprovante da Drogasil mostrando um total de R$271,70 e um texto "10x de R$27,17".
      **Saída Esperada:** { "description": "Drogasil", "amount": 271.70, "type": "expense", "category": "Farmácia", "paymentMethod": "installments", "installments": "10" }

  2.  **Imagem:** Foto de um recibo de um restaurante chamado "Cantina da Nona" no valor de R$120,50, pago no PIX.
      **Saída Esperada:** { "description": "Cantina da Nona", "amount": 120.50, "type": "expense", "category": "Restaurante", "paymentMethod": "one-time" }

  3.  **Imagem:** Anotação em um caderno "Recebi 200 do freela".
      **Saída Esperada:** { "description": "Recebimento de freela", "amount": 200, "type": "income", "category": "Outros", "paymentMethod": "one-time" }

  **Imagem para Análise:**
  {{media url=imageDataUri}}
  `,
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
    if (!output || !output.description || !output.type || !output.amount) {
      throw new Error('A Lúmina não conseguiu processar a imagem ou os dados essenciais (descrição, valor e tipo) estão incompletos.');
    }
    return output;
  }
);
