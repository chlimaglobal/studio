
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
  Sua tarefa é analisar a imagem fornecida e extrair a descrição, o valor, o tipo de transação (receita ou despesa) e sugerir uma categoria.
  A descrição deve ser um resumo curto e objetivo do que foi a transação (ex: "Pagamento para DB3 SERVICOS").
  O valor deve ser um número.

  - Se a imagem sugere um pagamento, compra, ou débito, o tipo é 'expense'.
  - Se a imagem sugere um recebimento, crédito, ou depósito, o tipo é 'income'.
  - Se for um comprovante de PIX ou pagamento de boleto, geralmente é uma 'expense'.
  - Baseado na descrição (ex: TELECOM, SERVICOS), sugira a categoria mais apropriada. "Internet" ou "Telefone/Celular" seriam boas opções para "DB3 SERVICOS DE TELECOMUNICACOES".
  
  **Categorias Disponíveis:**
  {{#each categories}}
  - {{this}}
  {{/each}}

  **Exemplos:**
  1.  **Imagem:** Comprovante de PIX para "DB3 SERVICOS" no valor de R$84,22.
      **Saída Esperada:** { "description": "DB3 SERVICOS DE TELECOMUNICACOES", "amount": 84.22, "type": "expense", "category": "Internet" }

  2.  **Imagem:** Foto de um recibo de um restaurante chamado "Cantina da Nona" no valor de R$120,50.
      **Saída Esperada:** { "description": "Cantina da Nona", "amount": 120.50, "type": "expense", "category": "Restaurante" }

  3.  **Imagem:** Anotação em um caderno "Recebi 200 do freela".
      **Saída Esperada:** { "description": "Recebimento de freela", "amount": 200, "type": "income", "category": "Outros" }

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
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output || !output.description || !output.type || !output.amount) {
      throw new Error('A Lúmina não conseguiu processar a imagem ou os dados essenciais (descrição, valor e tipo) estão incompletos.');
    }
    return output;
  }
);
