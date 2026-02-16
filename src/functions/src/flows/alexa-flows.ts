import { defineFlow } from 'genkit';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  AlexaExtractTransactionInputSchema,
  AlexaExtractTransactionOutputSchema,
  GetSimpleFinancialSummaryInputSchema,
  GetSimpleFinancialSummaryOutputSchema,
} from './types';
import { getAI } from './index';

/**
 * Flow para extrair uma transação da Alexa.
 * Segue EXATAMENTE o padrão do index.ts.
 */
export const alexaExtractTransactionFlow = defineFlow(
  {
    name: 'alexaExtractTransactionFlow',
    inputSchema: AlexaExtractTransactionInputSchema,
    outputSchema: AlexaExtractTransactionOutputSchema,
  },
  async (input) => {
    const ai = getAI();
    
    const prompt = `Você é a Lúmina, uma assistente financeira inteligente.
Sua tarefa é extrair UMA ÚNICA TRANSAÇÃO FINANCEIRA a partir de um texto falado.

REGRAS:
1. Extraia apenas UMA transação.
2. Se nenhuma transação válida for encontrada, retorne null.
3. O resultado DEVE seguir EXATAMENTE o schema fornecido.
4. A data deve ser a data atual se não for especificada.

Texto: ${input.text}
`;

    const result = await ai.generate({
      model: 'gemini-1.5-flash',
      prompt,
      output: { format: 'json', schema: AlexaExtractTransactionOutputSchema },
    });

    const output = result.output;
    if (!output) throw new HttpsError('internal', 'A Lúmina não conseguiu extrair a transação.');
    return output;
  }
);

/**
 * Flow para gerar um resumo financeiro simples para a Alexa.
 * Segue EXATAMENTE o padrão do index.ts.
 */
export const getSimpleFinancialSummaryFlow = defineFlow(
  {
    name: 'getSimpleFinancialSummaryFlow',
    inputSchema: GetSimpleFinancialSummaryInputSchema,
    outputSchema: GetSimpleFinancialSummaryOutputSchema,
  },
  async (input) => {
    const ai = getAI();
    
    const prompt = `Você é a Lúmina, uma assistente financeira amigável.
Gere um resumo financeiro CURTO (máximo 2 frases) e amigável para a Alexa.

Dados do usuário:
- Receitas totais: R$ ${input.totalIncome.toFixed(2)}
- Despesas totais: R$ ${input.totalExpense.toFixed(2)}
- Saldo atual: R$ ${input.balance.toFixed(2)}
- Período: ${input.period}

Seja objetiva e use uma linguagem natural para áudio.
`;

    const result = await ai.generate({
      model: 'gemini-1.5-flash',
      prompt,
    });

    return { summary: result.text || 'Não consegui gerar o resumo.' };
  }
);