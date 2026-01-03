import { z } from "genkit";
import { ai } from 'genkit';

// Schemas
import {
  AlexaExtractTransactionInputSchema,
  AlexaExtractTransactionOutputSchema,
  GetSimpleFinancialSummaryInputSchema,
  GetSimpleFinancialSummaryOutputSchema,
} from "../types";

/**
 * Flow: alexaExtractTransactionFlow
 * Extrai UMA transação financeira a partir do texto falado
 */
export const alexaExtractTransactionFlow = ai.defineFlow(
  {
    name: "alexaExtractTransactionFlow",
    inputSchema: AlexaExtractTransactionInputSchema,
    outputSchema: AlexaExtractTransactionOutputSchema,
  },
  async (input) => {
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
      model: 'gemini-1.5-flash',
      output: { format: "json", schema: AlexaExtractTransactionOutputSchema },
    });

    return result.output;
  }
);

/**
 * Flow: getSimpleFinancialSummaryFlow
 * Gera um resumo financeiro curto e amigável para a Alexa
 */
export const getSimpleFinancialSummaryFlow = ai.defineFlow(
  {
    name: "getSimpleFinancialSummaryFlow",
    inputSchema: GetSimpleFinancialSummaryInputSchema,
    outputSchema: GetSimpleFinancialSummaryOutputSchema,
  },
  async (input) => {
    const prompt = `
      Você é a Lúmina. Gere um resumo financeiro CURTO e amigável para a Alexa.
      Dados:
      - Receitas: ${input.totalIncome}
      - Despesas: ${input.totalExpense}
      - Saldo: ${input.balance}
      - Período: ${input.period}
    `;

    const result = await ai.generate({ model: 'gemini-1.5-flash', prompt });

    return { summary: result.text ?? "Não consegui gerar o resumo." };
  }
);
