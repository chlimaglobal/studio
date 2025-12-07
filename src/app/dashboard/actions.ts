'use server';

import { runFlow } from "genkit";
import { categorizeTransaction } from "@/ai/flows/categorize-transaction";
import { extractTransactionFromText } from "@/ai/flows/extract-transaction-from-text";
import type { TransactionCategory, ExtractTransactionOutput } from "@/lib/types";
import { z } from "zod";

/**
 * Gets a category suggestion from the AI based on a transaction description.
 * This is a Server Action that can be called from client components.
 * @param description The description of the transaction.
 * @returns The suggested category or null if not found.
 */
export async function getCategorySuggestion(description: string): Promise<TransactionCategory | null> {
    if (!description) return null;

    try {
        const result = await runFlow(categorizeTransaction, { description });
        if (result.category) {
            return result.category as TransactionCategory;
        }
        return null;
    } catch (e) {
        console.error("Lumina suggestion failed in Server Action:", e);
        return null;
    }
}

/**
 * Extracts transaction information from a natural language text string.
 * This is a Server Action.
 * @param text The text to analyze.
 * @returns The extracted transaction data or a fallback object.
 */
export async function extractTransactionInfoFromText(text: string): Promise<ExtractTransactionOutput> {
    try {
        const result = await runFlow(extractTransactionFromText, { text });
        if (result && result.amount !== undefined && result.description && result.type) {
            return result;
        }
        // Fallback if the flow returns an incomplete result
        return {
            description: text,
            amount: 0,
            type: 'expense',
            category: 'Outros',
            paymentMethod: 'one-time',
        };
    } catch (e) {
        console.error("Lumina extraction failed in Server Action:", e);
        // Return a fallback object on error
        return {
            description: text,
            amount: 0,
            type: 'expense',
            category: 'Outros',
            paymentMethod: 'one-time',
        };
    }
}
