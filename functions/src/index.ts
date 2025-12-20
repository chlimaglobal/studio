import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { DocumentData, Timestamp } from "firebase-admin/firestore";
// import * as sgMail from "@sendgrid/mail"; // Comentado para deploy local
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
// const sendgridApiKey = defineSecret("SENDGRID_API_KEY"); // Comentado para deploy local
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

// sgMail.setApiKey(sendgridApiKey.value()); // Comentado para deploy local

// Interface para correção de tipagem de transações
interface Transaction {
  type: string;
  category: string;
  amount: number;
  date: any;
  description: string;
}

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
        secrets: [geminiApiKey], // sendgridApiKey removido para deploy local
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
        secrets: [geminiApiKey], // sendgridApiKey removido para deploy local
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

// A função de envio de email foi comentada para evitar o erro de permissão no deploy local.
// No ambiente do Firebase Studio, essa função deve ser descomentada.
/*
export const onInviteCreated = functions
  .region(REGION)
  .runWith({ secrets: [sendgridApiKey] })
  .firestore.document("invites/{inviteId}")
  .onCreate(async (snap) => {
    try {
      const invite = snap.data() as DocumentData;
      if (!invite.sentToEmail) {
        console.warn("Convite sem e-mail de destino, ignorando.");
        return null;
      }
      
      const msg = {
        to: invite.sentToEmail,
        from: { 
            email: "no-reply@financeflow.app",
            name: "FinanceFlow" 
        },
        subject: `Você recebeu um convite de ${invite.sentByName} para o Modo Casal!`,
        text: `Olá! ${invite.sentByName} (${invite.sentByEmail || 'um e-mail privado'}) convidou você para usar o Modo Casal no FinanceFlow. Acesse o aplicativo para visualizar e aceitar o convite.`,
        html: `<p>Olá!</p><p><strong>${invite.sentByName}</strong> convidou você para usar o <strong>Modo Casal</strong> no FinanceFlow.</p><p>Acesse o aplicativo para visualizar e aceitar o convite.</p>`,
      };

      await sgMail.send(msg);
      return { success: true };
    } catch (error) {
      console.error("Erro ao enviar email de convite:", error);
      return null;
    }
  });
*/
