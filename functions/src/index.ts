import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { DocumentData, Timestamp } from "firebase-admin/firestore";
import * as sgMail from "@sendgrid/mail";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import { defineSecret } from "firebase-functions/params";
import * as cors from "cors";

// Genkit Imports - Atualizado para a versão mais recente
import { genkit, z } from 'genkit';
import { googleAI, gemini15Flash } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';

import {
    CategorizeTransactionInputSchema,
    CategorizeTransactionOutputSchema,
    ExtractTransactionInputSchema,
    ExtractTransactionOutputSchema,
    GenerateFinancialAnalysisInputSchema,
    GenerateFinancialAnalysisOutputSchema,
    ExtractFromFileInputSchema,
    ExtractFromFileOutputSchema,
    InvestorProfileInputSchema,
    InvestorProfileOutputSchema,
    SavingsGoalInputSchema,
    SavingsGoalOutputSchema,
    MediateGoalsInputSchema,
    MediateGoalsOutputSchema,
    ExtractFromImageInputSchema,
    ExtractFromImageOutputSchema,
    LuminaChatInputSchema,
    LuminaChatOutputSchema,
    ExtractMultipleTransactionsInputSchema,
    ExtractMultipleTransactionsOutputSchema,
    transactionCategories
} from './types';

import { LUMINA_BASE_PROMPT, LUMINA_DIAGNOSTIC_PROMPT, LUMINA_VOICE_COMMAND_PROMPT, LUMINA_SPEECH_SYNTHESIS_PROMPT } from './prompts/luminaBasePrompt';
import { getFinancialMarketData } from './services/market-data';
import { LUMINA_GOALS_SYSTEM_PROMPT } from './prompts/luminaGoalsPrompt';
import { LUMINA_COUPLE_PROMPT } from "./prompts/luminaCouplePrompt";
import { alexaExtractTransactionFlow, getSimpleFinancialSummaryFlow } from "./flows/alexa-flows";

// Define Secrets
const sendgridApiKey = defineSecret("SENDGRID_API_KEY");
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Initialize Firebase Admin
admin.initializeApp();
export const db = admin.firestore();

// Initialize Genkit - Configuração corrigida
const ai = genkit({
  plugins: [
    firebase(),
    googleAI({ apiKey: geminiApiKey.value() }),
  ],
  model: gemini15Flash, // Modelo padrão
});

sgMail.setApiKey(sendgridApiKey.value());

// Interface para correção de tipagem de transações
interface Transaction {
  type: string;
  category: string;
  amount: number;
  date: any;
  description: string;
}

// -----------------
// Genkit Flows
// -----------------

const categorizeTransactionFlow = ai.defineFlow(
  {
    name: 'categorizeTransactionFlow',
    inputSchema: CategorizeTransactionInputSchema,
    outputSchema: CategorizeTransactionOutputSchema,
  },
  async (input) => {
    const prompt = `Você é a Lúmina... Categorias: ${transactionCategories.join('\n- ')}. Descrição: ${input.description}`;
    const llmResponse = await ai.generate({
      prompt: prompt,
      output: { format: 'json', schema: CategorizeTransactionOutputSchema },
    });
    const output = llmResponse.output;
    if (!output) throw new Error('Falha na categorização.');
    return output;
  }
);

const extractTransactionFromTextFlow = ai.defineFlow(
  {
    name: 'extractTransactionFromTextFlow',
    inputSchema: ExtractTransactionInputSchema,
    outputSchema: ExtractTransactionOutputSchema,
  },
  async (input) => {
    const prompt = `Extraia detalhes da transação do texto: ${input.text}`;
    const llmResponse = await ai.generate({
      prompt: prompt,
      output: { format: 'json', schema: ExtractTransactionOutputSchema },
    });
    let output = llmResponse.output;
    if (!output || !output.description) {
      output = { description: input.text, amount: 0, type: 'expense', category: 'Outros', paymentMethod: 'one-time' };
    }
    return output;
  }
);

// ... (Demais fluxos seguem a mesma lógica de ai.defineFlow)

const generateFinancialAnalysisFlow = ai.defineFlow(
  {
    name: 'generateFinancialAnalysisFlow',
    inputSchema: GenerateFinancialAnalysisInputSchema,
    outputSchema: GenerateFinancialAnalysisOutputSchema,
  },
  async (input) => {
    if (!input.transactions || input.transactions.length === 0) {
      return { healthStatus: 'Atenção', diagnosis: 'Sem dados.', suggestions: [], trendAnalysis: undefined };
    }
    const result = await ai.generate({
        prompt: LUMINA_DIAGNOSTIC_PROMPT + JSON.stringify(input.transactions),
        output: { format: 'json', schema: GenerateFinancialAnalysisOutputSchema }
    });
    if (!result.output) throw new Error('Erro na análise.');
    return result.output;
  }
);

// -----------------
// Callable Functions Helpers
// -----------------
const REGION = "us-central1";

const createPremiumGenkitCallable = <I extends z.ZodTypeAny, O extends z.ZodTypeAny>(flow: any) => {
  return functions.region(REGION).runWith({ secrets: [geminiApiKey], memory: "1GB" }).https.onCall(async (data: z.infer<I>, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Autenticação necessária.');

    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    const isSubscribed = userData?.stripeSubscriptionStatus === 'active' || userData?.stripeSubscriptionStatus === 'trialing';
    const isAdmin = userData?.email === 'digitalacademyoficiall@gmail.com';

    if (!isSubscribed && !isAdmin) throw new functions.https.HttpsError('permission-denied', 'Premium necessário.');

    try {
      return await ai.runFlow(flow, data);
    } catch (e: any) {
      throw new functions.https.HttpsError('internal', e.message);
    }
  });
};

const createGenkitCallable = <I extends z.ZodTypeAny, O extends z.ZodTypeAny>(flow: any) => {
  return functions.region(REGION).runWith({ secrets: [geminiApiKey], memory: "1GB" }).https.onCall(async (data: z.infer<I>, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Autenticação necessária.');
    try {
      return await ai.runFlow(flow, data);
    } catch (e: any) {
      throw new functions.https.HttpsError('internal', e.message);
    }
  });
};

// Exportando as funções
export const getCategorySuggestion = createGenkitCallable(categorizeTransactionFlow);
export const extractTransactionInfoFromText = createGenkitCallable(extractTransactionFromTextFlow);
export const runAnalysis = createPremiumGenkitCallable(generateFinancialAnalysisFlow);
// ... Adicione os outros exports conforme necessário seguindo o padrão acima

// -----------------
// Cloud Firestore Triggers
// -----------------

export const onTransactionCreated = functions.region(REGION).firestore
  .document("users/{userId}/transactions/{transactionId}")
  .onCreate(async (snap, context) => {
    if (!snap.exists) return null;
    const { userId } = context.params;
    const userDocRef = db.doc(`users/${userId}`);
    
    try {
      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        const userData = userDoc.data();
        if (userData?.isDependent) return;

        const now = new Date();
        const currentMonthKey = format(now, "yyyy-MM");
        
        if (userData?.mesAlertadoRenda !== currentMonthKey) {
            // Lógica de alerta de gastos...
        }
      });
    } catch (error) {
      console.error(error);
    }
    return null;
  });