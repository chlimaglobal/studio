import { z } from "genkit";
import { ai, genkit, type Genkit } from 'genkit';  // Adicionei type Genkit para tipagem
import { googleAI } from '@genkit-ai/google-genai';
import { firebase } from '@genkit-ai/firebase';
import { defineSecret } from "firebase-functions/params";
import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/logger";  // Adicionei para logs melhores

// Schemas
import {
  AlexaExtractTransactionInputSchema,
  AlexaExtractTransactionOutputSchema,
  GetSimpleFinancialSummaryInputSchema,
  GetSimpleFinancialSummaryOutputSchema,
} from "../types";

// Secrets and lazy initialization for Genkit, similar to index.ts
const geminiApiKey = defineSecret("GEMINI_API_KEY");
let aiInstance: Genkit | undefined;  // Tipado como Genkit | undefined

function getAI(): Genkit {
    if (!aiInstance) {
        try {
            logger.info("Inicializando Genkit AI...");  // Log de init
            genkit({
                plugins: [
                    firebase(),
                    googleAI({ apiKey: geminiApiKey.value() }),
                ],
                enableTracingAndMetrics: true,
            });
            aiInstance = ai;
        } catch (e) {
            logger.error("CRITICAL: Genkit initialization failed in alexa-flows.", e);  // Log com logger
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
      Você é a Lúmina. Gere um resumo financeiro CURTO (máx 2 frases) e amigável para o período de ${input.period}.
      Inclua totais de receitas, despesas e saldo.
      Use linguagem conversacional.
      Dados:
      - Receitas: R$ ${input.totalIncome.toFixed(2)}
      - Despesas: R$ ${input.totalExpense.toFixed(2)}
      - Saldo: R$ ${input.balance.toFixed(2)}
    `;

    const result = await getAI().generate({
      prompt,
      model: 'gemini-1.5-flash',
      output: { format: "json", schema: GetSimpleFinancialSummaryOutputSchema },  // Adicionado para consistência
    });

    return { summary: result.output.summary ?? "Não consegui gerar o resumo." };  // Ajustado para usar output.summary se schema aplicado
  }
);