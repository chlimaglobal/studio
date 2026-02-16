import { defineFlow } from 'genkit';
import {
  AlexaExtractTransactionInputSchema,
  AlexaExtractTransactionOutputSchema,
  GetSimpleFinancialSummaryInputSchema,
  GetSimpleFinancialSummaryOutputSchema,
} from '../types';
import { getAI } from '../index';


export const alexaExtractTransactionFlow = defineFlow(
    {
      name: "alexaExtractTransactionFlow",
      inputSchema: AlexaExtractTransactionInputSchema,
      outputSchema: AlexaExtractTransactionOutputSchema,
    },
    async (input) => {
      const ai = getAI();
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
  
export const getSimpleFinancialSummaryFlow = defineFlow(
    {
        name: "getSimpleFinancialSummaryFlow",
        inputSchema: GetSimpleFinancialSummaryInputSchema,
        outputSchema: GetSimpleFinancialSummaryOutputSchema,
    },
    async (input) => {
        const ai = getAI();
        const prompt = `
        Você é a Lúmina. Gere um resumo financeiro CURTO (máx 2 frases) e amigável para o período de ${input.period}.
        Inclua totais de receitas, despesas e saldo.
        Use linguagem conversacional.
        Dados:
        - Receitas: R$ ${input.totalIncome.toFixed(2)}
        - Despesas: R$ ${input.totalExpense.toFixed(2)}
        - Saldo: R$ ${input.balance.toFixed(2)}
        `;

        const result = await ai.generate({
        prompt,
        model: 'gemini-1.5-flash',
        output: { format: "json", schema: GetSimpleFinancialSummaryOutputSchema },
        });

        const output = result.output;
        if (!output?.summary) {
            return { summary: "Não consegui gerar o resumo." };
        }
        return output;
    }
);
