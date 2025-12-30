
'use server';

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


async function callApi<I, O>(endpoint: string, data: I): Promise<O> {
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    try {
        const response = await fetch(`${origin}/api/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.error || `Falha na chamada da API: ${response.statusText}`);
        }
        
        return await response.json();

    } catch (error: any) {
        console.error(`Error calling API endpoint '${endpoint}':`, error.message);
        throw new Error(error.message || `Falha ao executar ${endpoint}: Ocorreu um erro desconhecido.`);
    }
}


export async function getCategorySuggestion(input: CategorizeTransactionInput): Promise<CategorizeTransactionOutput> {
    return callApi<CategorizeTransactionInput, CategorizeTransactionOutput>('lumina/categorize', input);
}

export async function extractTransactionInfoFromText(input: ExtractTransactionInput): Promise<ExtractTransactionOutput> {
     return callApi<ExtractTransactionInput, ExtractTransactionOutput>('lumina/extract-text', input);
}

export async function extractMultipleTransactions(input: ExtractMultipleTransactionsInput): Promise<ExtractMultipleTransactionsOutput> {
    return callApi<ExtractMultipleTransactionsInput, ExtractMultipleTransactionsOutput>('lumina/extract-multiple', input);
}

export async function runAnalysis(input: GenerateFinancialAnalysisInput): Promise<GenerateFinancialAnalysisOutput> {
    return callApi<GenerateFinancialAnalysisInput, GenerateFinancialAnalysisOutput>('lumina/analysis', input);
}

export async function runFileExtraction(input: ExtractFromFileInput): Promise<ExtractFromFileOutput> {
    return callApi<ExtractFromFileInput, ExtractFromFileOutput>('lumina/extract-file', input);
}

export async function runInvestorProfileAnalysis(input: InvestorProfileInput): Promise<InvestorProfileOutput> {
    return callApi<InvestorProfileInput, InvestorProfileOutput>('lumina/investor-profile', input);
}

export async function runSavingsGoalCalculation(input: SavingsGoalInput): Promise<SavingsGoalOutput> {
    return callApi<SavingsGoalInput, SavingsGoalOutput>('lumina/savings-goal', input);
}

export async function runGoalMediation(input: MediateGoalsInput): Promise<MediateGoalsOutput> {
    return callApi<MediateGoalsInput, MediateGoalsOutput>('lumina/mediate-goals', input);
}

export async function runImageExtraction(input: ExtractFromImageInput): Promise<ExtractFromImageOutput> {
    return callApi<ExtractFromImageInput, ExtractFromImageOutput>('lumina/extract-image', input);
}
