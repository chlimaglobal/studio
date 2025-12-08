'use server';

import { runFlow } from "@/ai/run"; 
import { categorizeTransaction } from "@/ai/flows/categorize-transaction";
import { extractTransactionFromText } from "@/ai/flows/extract-transaction-from-text";
import { generateFinancialAnalysis } from "@/ai/flows/generate-financial-analysis";
import type { TransactionCategory, ExtractTransactionOutput } from "@/lib/types";
import type { GenerateFinancialAnalysisInput, GenerateFinancialAnalysisOutput } from "@/ai/flows/generate-financial-analysis";

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

        if (result?.category) {
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

        return {
            description: text,
            amount: 0,
            type: 'expense',
            category: 'Outros',
            paymentMethod: 'one-time',
        };
    } catch (e) {
        console.error("Lumina extraction failed in Server Action:", e);

        return {
            description: text,
            amount: 0,
            type: 'expense',
            category: 'Outros',
            paymentMethod: 'one-time',
        };
    }
}


/**
 * Runs the financial analysis flow.
 * This is a Server Action.
 * @param input The transaction data for analysis.
 * @returns The financial analysis output.
 */
export async function runAnalysis(input: GenerateFinancialAnalysisInput): Promise<GenerateFinancialAnalysisOutput> {
    try {
        const result = await runFlow(generateFinancialAnalysis, input);
        return result;
    } catch (e) {
        console.error("Lumina analysis failed in Server Action:", e);
        // Return a default/error state that matches the expected output schema
        return {
            healthStatus: 'Atenção',
            diagnosis: 'Não foi possível gerar a análise no momento. Por favor, tente novamente mais tarde.',
            suggestions: ['Verifique sua conexão e tente recarregar a página.'],
            trendAnalysis: undefined
        };
    }
}
