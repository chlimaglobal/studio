
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { DocumentData, Timestamp } from "firebase-admin/firestore";
import * as sgMail from "@sendgrid/mail";
import { format } from "date-fns";
import { defineSecret } from "firebase-functions/params";

// Genkit Imports - Versão 1.0.0+
import { genkit } from 'genkit';
import { googleAI, gemini15Flash } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';

// Importação de Schemas e Prompts
import {
    CategorizeTransactionInputSchema,
    CategorizeTransactionOutputSchema,
    transactionCategories
} from './types';

import { LUMINA_DIAGNOSTIC_PROMPT } from './prompts/luminaBasePrompt';
import { alexaExtractTransactionFlow, getSimpleFinancialSummaryFlow } from "./flows/alexa-flows";

// Define Secrets
const sendgridApiKey = defineSecret("SENDGRID_API_KEY");
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Initialize Firebase Admin
admin.initializeApp();
export const db = admin.firestore();

/**
 * Inicialização Segura do Genkit (Lazy Initialization)
 * Resolve o erro de acesso ao Secret durante a fase de build/deploy.
 */
let aiInstance: any = null;
function getAI() {
  if (!aiInstance) {
    aiInstance = genkit({
      plugins: [
        firebase(),
        googleAI({ apiKey: geminiApiKey.value() }),
      ],
      model: gemini15Flash,
    });
  }
  return aiInstance;
}

// Set SendGrid API Key at runtime
sgMail.setApiKey(sendgridApiKey.value());

const REGION = "us-central1";

// -----------------
// Genkit Flow Definitions (Internal)
// -----------------

const categorizeTransactionFlow = (ai: any) => ai.defineFlow(
  { name: 'categorizeTransactionFlow', inputSchema: CategorizeTransactionInputSchema, outputSchema: CategorizeTransactionOutputSchema },
  async (input: any) => {
    const prompt = `Você é a Lúmina... Categorias: ${transactionCategories.join('\n- ')}. Descrição: ${input.description}`;
    const res = await ai.generate({ prompt, output: { format: 'json', schema: CategorizeTransactionOutputSchema } });
    if (!res.output) throw new Error('Falha na categorização.');
    return res.output;
  }
);

// -----------------
// Callable Functions
// -----------------

const createGenkitCallable = (flowLogic: (ai: any, data: any) => Promise<any>) => {
  return functions
    .region(REGION)
    .runWith({ secrets: [geminiApiKey, sendgridApiKey], memory: "1GB" })
    .https.onCall(async (data, context) => {
      if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Autenticação necessária.');
      
      try {
        const ai = getAI();
        return await flowLogic(ai, data);
      } catch (e: any) {
        console.error("Erro no Flow:", e);
        throw new functions.https.HttpsError('internal', e.message);
      }
    });
};

// Exports para App e Alexa
export const getCategorySuggestion = createGenkitCallable(async (ai: any, data: any) => {
    const flow = categorizeTransactionFlow(ai);
    return await flow(data);
});

export const alexaExtractTransaction = createGenkitCallable(async (ai: any, data: any) => {
    const flow = alexaExtractTransactionFlow(ai);
    return await flow(data);
});

export const alexaGetFinancialSummary = createGenkitCallable(async (ai: any, data: any) => {
    const flow = getSimpleFinancialSummaryFlow(ai);
    return await flow(data);
});


// -----------------
// Firestore Triggers
// -----------------

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


export const onTransactionCreated = functions.region(REGION).firestore
  .document("users/{userId}/transactions/{transactionId}")
  .onCreate(async (snap, context) => {
    const { userId } = context.params;
    console.log(`Monitorando transação para: ${userId}`);
    // Lógica futura pode ser adicionada aqui.
    return null;
  });

// Adicionando aliases para outras funções que podem ser necessárias
export const extractTransactionInfoFromText = alexaExtractTransaction;
export const runAnalysis = alexaExtractTransaction;
