import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as sgMail from "@sendgrid/mail";
import { format } from "date-fns";
import { defineSecret } from "firebase-functions/params";

// Genkit Imports - Atualizado para v0.5+
import { genkit, z } from 'genkit';
import { googleAI, gemini15Flash } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';

// Importação de Tipos e Prompts (Certifique-se que estes arquivos existem na pasta)
import {
    CategorizeTransactionInputSchema,
    CategorizeTransactionOutputSchema,
    ExtractTransactionInputSchema,
    ExtractTransactionOutputSchema,
    GenerateFinancialAnalysisInputSchema,
    GenerateFinancialAnalysisOutputSchema,
    transactionCategories
} from './types';

import { LUMINA_DIAGNOSTIC_PROMPT } from './prompts/luminaBasePrompt';

// Define Secrets
const sendgridApiKey = defineSecret("SENDGRID_API_KEY");
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Initialize Firebase Admin
admin.initializeApp();
export const db = admin.firestore();

// Initialize Genkit - Sintaxe v0.5+ corrigida
const ai = genkit({
  plugins: [
    firebase(),
    googleAI({ apiKey: geminiApiKey.value() }),
  ],
  model: gemini15Flash, 
});

const REGION = "us-central1";

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

const generateFinancialAnalysisFlow = ai.defineFlow(
  {
    name: 'generateFinancialAnalysisFlow',
    inputSchema: GenerateFinancialAnalysisInputSchema,
    outputSchema: GenerateFinancialAnalysisOutputSchema,
  },
  async (input) => {
    if (!input.transactions || input.transactions.length === 0) {
      // Ajuste de retorno para satisfazer o enum do Schema (Saudável | Atenção | Crítico)
      return { 
        healthStatus: 'Atenção' as const, 
        diagnosis: 'Sem dados suficientes para análise.', 
        suggestions: ['Adicione mais transações para uma análise detalhada.'], 
        trendAnalysis: undefined 
      };
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

// CORREÇÃO: No Genkit v0.5+, o ai.runFlow foi substituído pela chamada direta da função do fluxo: flow(data)
const createPremiumGenkitCallable = (flow: any) => {
  return functions
    .region(REGION)
    .runWith({ 
        secrets: [geminiApiKey, sendgridApiKey], 
        memory: "1GB" 
    })
    .https.onCall(async (data, context) => {
      if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Autenticação necessária.');

      const userDoc = await db.collection('users').doc(context.auth.uid).get();
      const userData = userDoc.data();
      const isSubscribed = userData?.stripeSubscriptionStatus === 'active' || userData?.stripeSubscriptionStatus === 'trialing';
      const isAdmin = userData?.email === 'digitalacademyoficiall@gmail.com';

      if (!isSubscribed && !isAdmin) throw new functions.https.HttpsError('permission-denied', 'Assinatura Premium necessária.');

      try {
        // Chamada direta do fluxo na versão v0.5+
        return await flow(data);
      } catch (e: any) {
        console.error("Flow Error:", e);
        throw new functions.https.HttpsError('internal', e.message);
      }
    });
};

const createGenkitCallable = (flow: any) => {
  return functions
    .region(REGION)
    .runWith({ 
        secrets: [geminiApiKey, sendgridApiKey], 
        memory: "1GB" 
    })
    .https.onCall(async (data, context) => {
      if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Autenticação necessária.');
      try {
        return await flow(data);
      } catch (e: any) {
        console.error("Flow Error:", e);
        throw new functions.https.HttpsError('internal', e.message);
      }
    });
};

// Exportando as funções para o Firebase
export const getCategorySuggestion = createGenkitCallable(categorizeTransactionFlow);
export const extractTransactionInfoFromText = createGenkitCallable(extractTransactionFromTextFlow);
export const runAnalysis = createPremiumGenkitCallable(generateFinancialAnalysisFlow);

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
        
        // Aqui você pode adicionar lógica de notificação ou atualização de saldo
        console.log(`Nova transação para usuário ${userId} no mês ${currentMonthKey}`);
      });
    } catch (error) {
      console.error("Trigger Error:", error);
    }
    return null;
  });