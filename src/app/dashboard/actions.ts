
'use server';

import { getFunctions, httpsCallable, Functions, HttpsCallableError } from 'firebase/functions';
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

// Helper to call a Firebase Cloud Function and handle the response structure.
async function callFirebaseFunction<T, O>(functionName: string, data: T): Promise<O> {
    try {
        const functions = getFunctions(app, 'us-central1');
        console.log(`[DEBUG] Chamando Firebase function: ${functionName} na região us-central1`); // Log para debug de deploy
        const callable = httpsCallable<T, { data: O }>(functions, functionName);
        const result = await callable(data);
        console.log(`[DEBUG] Firebase function ${functionName} executada com sucesso`); // Log de sucesso
        return result.data; // The data is now directly on result.data
    } catch (error: any) {
        console.error(`Error calling Firebase function '${functionName}':`, error);

        // Tratamento de erro para dar feedback específico
        if (error.code === 'functions/permission-denied') {
            throw new Error(`Permissão negada. ${error.message}`);
        }
        if (error.code === 'functions/unauthenticated') {
            throw new Error('Autenticação necessária para este recurso.');
        }
        if (error.code === 'functions/not-found') {
            console.error(`[DEBUG] Função '${functionName}' não encontrada — verifique deploy com 'firebase deploy --only functions'`); // Log específico para deploy
            // Fallback para modo dev: pula análise se local
            if (process.env.NODE_ENV === 'development') {
                console.warn(`[DEV MODE] Pulando análise para ${functionName} — use dados mock se necessário.`);
                return { healthStatus: 'Atenção', diagnosis: 'Análise mock (modo dev)', suggestions: [] } as O; // Retorno mock mínimo para não quebrar UI
            }
            throw new Error(`A função '${functionName}' não foi encontrada no backend. Verifique se ela foi implantada corretamente.`);
        }
        
        throw new Error(`Falha ao executar ${functionName}: ${error.message || 'Ocorreu um erro desconhecido.'}`);
    }
}


export async function getCategorySuggestion(input: CategorizeTransactionInput): Promise<CategorizeTransactionOutput> {
    // Note: This function uses a different helper in the original code, we'll align it if needed.
    // For now, assuming it should also use the generic helper.
    const result = await callFirebaseFunction<CategorizeTransactionInput, CategorizeTransactionOutput>('getCategorySuggestion', input);
    return result;
}

export async function extractTransactionInfoFromText(input: {text: string}): Promise<ExtractTransactionOutput> {
     return callFirebaseFunction<{text: string}, ExtractTransactionOutput>('extractTransactionInfoFromText', input);
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
