import { z } from "genkit";
import { ai, genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { firebase } from '@genkit-ai/firebase';
import { defineSecret } from "firebase-functions/params";
import { HttpsError } from "firebase-functions/v2/https";

// Schemas
import {
  AlexaExtractTransactionInputSchema,
  AlexaExtractTransactionOutputSchema,
  GetSimpleFinancialSummaryInputSchema,
  GetSimpleFinancialSummaryOutputSchema,
} from "../types";

// Secrets and lazy initialization for Genkit, similar to index.ts
const geminiApiKey = defineSecret("GEMINI_API_KEY");
let aiInstance: any;

function getAI() {
    if (!aiInstance) {
        try {
            genkit({
                plugins: [
                    firebase(),
                    googleAI({ apiKey: geminiApiKey.value() }),
                ],
                enableTracingAndMetrics: true,
            });
            aiInstance = ai;
        } catch(e) {
            console.error("CRITICAL: Genkit initialization failed in alexa-flows.", e);
            throw new HttpsError('internal', 'AI service initialization failed.');
        }
    }
    return aiInstance;
}


/**
 * Flow: alexaExtractTransactionFlow
 * Extrai UMA transação financeira a partir do texto falado
 */
export const alexaExtractTransactionFlow = getAI().defineFlow(
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

    const result = await getAI().generate({
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
export const getSimpleFinancialSummaryFlow = getAI().defineFlow(
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

    const result = await getAI().generate({ model: 'gemini-1.5-flash', prompt });

    return { summary: result.text ?? "Não consegui gerar o resumo." };
  }
);
