import { genkit, defineFlow, ai } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { firebase } from '@genkit-ai/firebase';
import { HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from "firebase-functions/params";

import {
  AlexaExtractTransactionInputSchema,
  AlexaExtractTransactionOutputSchema,
  GetSimpleFinancialSummaryInputSchema,
  GetSimpleFinancialSummaryOutputSchema,
} from '../types';

// This is a self-contained initializer to avoid circular dependencies.
const geminiApiKey = defineSecret("GEMINI_API_KEY");
let aiInstance: any;
function getAI() {
    if (!aiInstance) {
        try {
            const apiKey = geminiApiKey.value();
            if (!apiKey) throw new HttpsError('internal', 'GEMINI_API_KEY não configurada');
            
            genkit({
                plugins: [
                    firebase(),
                    googleAI({ apiKey }),
                ],
                enableTracingAndMetrics: true,
            });
            aiInstance = ai;
        } catch(e) {
            console.error("CRITICAL: Genkit initialization failed for Alexa Flow.", e);
            throw new HttpsError('internal', 'AI service initialization failed for Alexa Flow.');
        }
    }
    return aiInstance;
}


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
