
'use server';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import type { 
    CategorizeTransactionInput,
    CategorizeTransactionOutput,
    ExtractTransactionInput,
    ExtractTransactionOutput,
    GenerateFinancialAnalysisInput,
    GenerateFinancialAnalysisOutput,
    ExtractFromFileInput,
    ExtractFromFileOutput,
    InvestorProfileInput,
    InvestorProfileOutput,
    SavingsGoalInput,
    SavingsGoalOutput,
    MediateGoalsInput,
    MediateGoalsOutput,
    ExtractFromImageInput,
    ExtractFromImageOutput,
    ExtractMultipleTransactionsInput,
    ExtractMultipleTransactionsOutput
} from '@/lib/types';

// Helper to call a Firebase Cloud Function and handle the response structure.
async function callFirebaseFunction<T, O>(functionName: string, data: T): Promise<O> {
    try {
        const functions = getFunctions(app, 'us-central1');
        const callable = httpsCallable<T, { data: O }>(functions, functionName);
        const result = await callable(data);
        return result.data; // The data is now directly on result.data
    } catch (error) {
        console.error(`Error calling Firebase function '${functionName}':`, error);
        if (error instanceof Error) {
            throw new Error(`Failed to execute ${functionName}: ${error.message}`);
        }
        throw new Error(`An unknown error occurred while executing ${functionName}.`);
    }
}


export async function getCategorySuggestion(input: CategorizeTransactionInput): Promise<CategorizeTransactionOutput> {
    const result = await callFirebaseFunction<CategorizeTransactionInput, CategorizeTransactionOutput>('getCategorySuggestion', input);
    return result;
}

export async function extractTransactionInfoFromText(text: string): Promise<ExtractTransactionOutput> {
     return callFirebaseFunction<ExtractTransactionInput, ExtractTransactionOutput>('extractTransactionInfoFromText', { text });
}

export async function extractMultipleTransactions(text: string): Promise<ExtractMultipleTransactionsOutput> {
    return callFirebaseFunction<ExtractMultipleTransactionsInput, ExtractMultipleTransactionsOutput>('extractMultipleTransactions', { text });
}

export async function runAnalysis(input: GenerateFinancialAnalysisInput): Promise<GenerateFinancialAnalysisOutput> {
    return callFirebaseFunction<GenerateFinancialAnalysisInput, GenerateFinancialAnalysisOutput>('runAnalysis', input);
}

export async function runFileExtraction(input: ExtractFromFileInput): Promise<ExtractFromFileOutput> {
    return callFirebaseFunction<ExtractFromFileInput, ExtractFromFileOutput>('runFileExtraction', input);
}

export async function runInvestorProfileAnalysis(input: InvestorProfileInput): Promise<InvestorProfileOutput> {
    return callFirebaseFunction<InvestorProfileInput, InvestorProfileOutput>('runInvestorProfileAnalysis', input);
}

export async function runSavingsGoalCalculation(input: SavingsGoalInput): Promise<SavingsGoalOutput> {
    return callFirebaseFunction<SavingsGoalInput, SavingsGoalOutput>('runSavingsGoalCalculation', input);
}

export async function runGoalMediation(input: MediateGoalsInput): Promise<MediateGoalsOutput> {
    return callFirebaseFunction<MediateGoalsInput, MediateGoalsOutput>('runGoalMediation', input);
}

export async function runImageExtraction(input: ExtractFromImageInput): Promise<ExtractFromImageOutput> {
    return callFirebaseFunction<ExtractFromImageInput, ExtractFromImageOutput>('runImageExtraction', input);
}
