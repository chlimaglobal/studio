
import { run } from 'genkit';
import { alexaExtractTransactionFlow, getSimpleFinancialSummaryFlow } from '../index';
import { DocumentData } from 'firebase-admin/firestore';

/**
 * Invokes the Genkit flow to extract transaction details from a spoken phrase.
 * @param text The phrase spoken by the user to Alexa.
 * @returns The structured transaction data or null if extraction fails.
 */
export async function extractTransactionFromSpeech(text: string): Promise<any | null> {
    try {
        const result = await run(alexaExtractTransactionFlow, { text });
        return result;
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
        const result = await run(getSimpleFinancialSummaryFlow, {
            totalIncome,
            totalExpense,
            balance,
            period: 'month' // Assuming a monthly summary for now
        });
        return result.summary;
    } catch (error) {
        console.error("Error running getSimpleFinancialSummaryFlow:", error);
        return "Desculpe, não consegui gerar seu resumo financeiro no momento.";
    }
}

    