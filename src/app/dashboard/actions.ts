'use server';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import type { 
    CategorizeTransactionOutput,
    ExtractTransactionOutput,
    GenerateFinancialAnalysisOutput,
    ExtractFromFileOutput,
    InvestorProfileOutput,
    SavingsGoalOutput,
    MediateGoalsOutput,
    ExtractFromImageOutput
} from '@/lib/types';
import { z } from 'zod';

// Helper to call a Firebase Cloud Function and handle the response structure.
async function callFirebaseFunction<I, O>(functionName: string, data: I): Promise<O> {
    try {
        const functions = getFunctions(app); // Call with app instance
        const callable = httpsCallable<I, { data: O }>(functions, functionName);
        const result = await callable(data);
        return result.data.data;
    } catch (error) {
        console.error(`Error calling Firebase function '${functionName}':`, error);
        if (error instanceof Error) {
            throw new Error(`Failed to execute ${functionName}: ${error.message}`);
        }
        throw new Error(`An unknown error occurred while executing ${functionName}.`);
    }
}


export async function getCategorySuggestion(description: string): Promise<CategorizeTransactionOutput> {
    return callFirebaseFunction('getCategorySuggestion', { description });
}

export async function extractTransactionInfoFromText(text: string): Promise<ExtractTransactionOutput> {
     return callFirebaseFunction('extractTransactionInfoFromText', { text });
}

export async function runAnalysis(input: { transactions: any[] }): Promise<GenerateFinancialAnalysisOutput> {
    return callFirebaseFunction('runAnalysis', input);
}

export async function runFileExtraction(input: { fileContent: string; fileName: string }): Promise<ExtractFromFileOutput> {
    return callFirebaseFunction('runFileExtraction', input);
}

export async function runInvestorProfileAnalysis(input: { answers: Record<string, string> }): Promise<InvestorProfileOutput> {
    return callFirebaseFunction('runInvestorProfileAnalysis', input);
}

export async function runSavingsGoalCalculation(input: { transactions: any[] }): Promise<SavingsGoalOutput> {
    return callFirebaseFunction('runSavingsGoalCalculation', input);
}

export async function runGoalMediation(input: MediateGoalsOutput): Promise<MediateGoalsOutput> {
    return callFirebaseFunction('runGoalMediation', input);
}

export async function runImageExtraction(input: { imageDataUri: string, allTransactions?: any[] }): Promise<ExtractFromImageOutput> {
    return callFirebaseFunction('runImageExtraction', input);
}
