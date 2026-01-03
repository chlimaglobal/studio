
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
} from '@/lib/definitions';


async function callFirebaseFunction<I, O>(functionName: string, data: I): Promise<O> {
    try {
        const functions = getFunctions(app, 'us-central1');
        const callable = httpsCallable<I, { data: O }>(functions, functionName);
        const result = await callable(data);
        return result.data.data;

    } catch (error: any) {
        console.error(`Error calling Firebase function '${functionName}':`, error.code, error.message);

        if (error.code === 'functions/permission-denied') {
            throw new Error(`Assinatura Premium necessária para este recurso.`);
        }
        if (error.code === 'functions/unauthenticated') {
            throw new Error('Autenticação necessária. Por favor, faça login novamente.');
        }
        if (error.code === 'functions/not-found') {
            console.error(`[DEBUG] Função '${functionName}' não encontrada — verifique o deploy com 'firebase deploy --only functions'`);
            throw new Error(`A função '${functionName}' não foi encontrada no backend. Verifique se ela foi implantada corretamente.`);
        }
        
        throw new Error(error.message || `Falha ao executar ${functionName}: Ocorreu um erro desconhecido.`);
    }
}


export async function getCategorySuggestion(input: CategorizeTransactionInput): Promise<CategorizeTransactionOutput> {
    return callFirebaseFunction<CategorizeTransactionInput, CategorizeTransactionOutput>('getCategorySuggestion', input);
}

export async function extractTransactionInfoFromText(input: ExtractTransactionInput): Promise<ExtractTransactionOutput> {
     return callFirebaseFunction<ExtractTransactionInput, ExtractTransactionOutput>('extractTransactionInfoFromText', input);
}

export async function extractMultipleTransactions(input: ExtractMultipleTransactionsInput): Promise<ExtractMultipleTransactionsOutput> {
    return callFirebaseFunction<ExtractMultipleTransactionsInput, ExtractMultipleTransactionsOutput>('extractMultipleTransactions', input);
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
