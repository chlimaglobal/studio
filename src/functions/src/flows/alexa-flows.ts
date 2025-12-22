
import { z } from "genkit";
import {
  AlexaExtractTransactionInputSchema,
  AlexaExtractTransactionOutputSchema,
  GetSimpleFinancialSummaryInputSchema,
  GetSimpleFinancialSummaryOutputSchema,
} from "../types";

/**
 * Retorna uma função de fluxo para extrair uma transação da Alexa.
 * @param ai - A instância do Genkit AI.
 */
export const alexaExtractTransactionFlow = (ai: any) => ai.defineFlow(
  {
    name: "alexaExtractTransactionFlow",
    inputSchema: AlexaExtractTransactionInputSchema,
    outputSchema: AlexaExtractTransactionOutputSchema,
  },
  async (input: z.infer<typeof AlexaExtractTransactionInputSchema>) => {
    const prompt = `
      Você é a Lúmina, uma assistente financeira inteligente.
      Sua tarefa é extrair UMA ÚNICA TRANSAÇÃO FINANCEIRA a partir de um texto falado.
      REGRAS:
      1. Extraia apenas UMA transação.
      2. Se nenhuma transação válida for encontrada, retorne null.
      3. O resultado DEVE seguir EXATAMENTE o schema fornecido.
      4. A data deve ser a data atual se não for especificada.
      Texto: ${input.text}
    `;

    const result = await ai.generate({
      prompt,
      output: { format: "json", schema: AlexaExtractTransactionOutputSchema },
    });

    return result.output;
  }
);

/**
 * Retorna uma função de fluxo para gerar um resumo financeiro para a Alexa.
 * @param ai - A instância do Genkit AI.
 */
export const getSimpleFinancialSummaryFlow = (ai: any) => ai.defineFlow(
  {
    name: "getSimpleFinancialSummaryFlow",
    inputSchema: GetSimpleFinancialSummaryInputSchema,
    outputSchema: GetSimpleFinancialSummaryOutputSchema,
  },
  async (input: z.infer<typeof GetSimpleFinancialSummaryInputSchema>) => {
    const prompt = `
      Você é a Lúmina. Gere um resumo financeiro CURTO e amigável para a Alexa.
      Dados:
      - Receitas: ${input.totalIncome}
      - Despesas: ${input.totalExpense}
      - Saldo: ${input.balance}
      - Período: ${input.period}
    `;

    const result = await ai.generate({ prompt });

    return { summary: result.text ?? "Não consegui gerar o resumo." };
  }
);
