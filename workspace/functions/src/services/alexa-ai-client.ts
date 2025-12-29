
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { DocumentData } from 'firebase-admin/firestore';

// We need a separate client app instance to call v2 functions from a v1 function context
const clientApp = !getApps().length ? initializeApp({
    projectId: process.env.GCLOUD_PROJECT,
}, "alexaClient") : getApp("alexaClient");

const functions = getFunctions(clientApp, 'us-central1');

const extractTransactionCallable = httpsCallable(functions, 'extractTransactionInfoFromText');
const getSummaryCallable = httpsCallable(functions, 'getSummaryFromSpeech'); // Assuming a similar function exists

/**
 * Invokes the Genkit flow to extract transaction details from a spoken phrase.
 * @param text The phrase spoken by the user to Alexa.
 * @returns The structured transaction data or null if extraction fails.
 */
export async function extractTransactionFromSpeech(text: string): Promise<any | null> {
    try {
        // The v2 function expects the data directly, not nested in a 'data' object for the call
        const result = await extractTransactionCallable({ text });
        return result.data; // The result from a v2 callable is in result.data
    } catch (error) {
        console.error("Error running alexaExtractTransactionFlow:", error);
        return null;
    }
}

/**
 * Invokes the Genkit flow to get a natural language summary of financial data.
 * @param transactions A list of the user's transactions.
 * @returns A string with a natural language summary.
 */
export async function getSummaryFromSpeech(transactions: DocumentData[]): Promise<string> {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const balance = totalIncome - totalExpense;

    try {
        const result: any = await getSummaryCallable({
            totalIncome,
            totalExpense,
            balance,
            period: 'month' // Assuming a monthly summary for now
        });
        return result.data.summary;
    } catch (error) {
        console.error("Error running getSimpleFinancialSummaryFlow:", error);
        return "Desculpe, não consegui gerar seu resumo financeiro no momento.";
    }
}

    