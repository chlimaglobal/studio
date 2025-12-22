import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";

// Genkit
import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";

// Flows
import {
  alexaExtractTransactionFlow,
  getSimpleFinancialSummaryFlow,
} from "./flows/alexa-flows";

// Secret
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Firebase
admin.initializeApp();

const REGION = "us-central1";

/**
 * Helper para criar o Genkit AI SOMENTE EM RUNTIME
 */
function createAI(apiKey: string) {
  return genkit({
    plugins: [
      googleAI({
        apiKey,
      }),
    ],
    model: "googleai/gemini-1.5-flash",
  });
}

// --- ALEXA: EXTRAIR TRANSAÇÃO ---
export const alexaExtractTransaction = functions
  .region(REGION)
  .runWith({
    secrets: [geminiApiKey],
    memory: "1GB",
    timeoutSeconds: 60,
  })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Erro de autenticação"
      );
    }

    const ai = createAI(geminiApiKey.value());
    const ctx = { ai };

    return alexaExtractTransactionFlow.run(data, ctx);
  });

// --- ALEXA: RESUMO FINANCEIRO ---
export const alexaGetFinancialSummary = functions
  .region(REGION)
  .runWith({
    secrets: [geminiApiKey],
    memory: "1GB",
  })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Erro de autenticação"
      );
    }

    const ai = createAI(geminiApiKey.value());
    const ctx = { ai };

    return getSimpleFinancialSummaryFlow.run(data, ctx);
  });

// --- FIRESTORE TRIGGER ---
export const onTransactionCreated = functions
  .region(REGION)
  .firestore.document("users/{userId}/transactions/{transactionId}")
  .onCreate(async (snap) => {
    console.log("Transação criada:", snap.id);
    return null;
  });

// --- ALIASES ---
export const getCategorySuggestion = alexaExtractTransaction;
export const extractTransactionInfoFromText = alexaExtractTransaction;
export const runAnalysis = alexaExtractTransaction;
