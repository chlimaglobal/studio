
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
import { runFlow } from '@/ai/run';

// TODO: Implementar os fluxos correspondentes
// import { categorizeTransactionFlow, extractTransactionInfoFromTextFlow, ... } from '@/ai/flows/...';

export async function getCategorySuggestion(input: CategorizeTransactionInput): Promise<CategorizeTransactionOutput> {
    // const result = await runFlow(categorizeTransactionFlow, input);
    // return result;
    console.warn("getCategorySuggestion called but no flow is implemented.");
    return { category: 'Outros' };
}

export async function extractTransactionInfoFromText(input: ExtractTransactionInput): Promise<ExtractTransactionOutput> {
    // const result = await runFlow(extractTransactionInfoFromTextFlow, input);
    // return result;
    console.warn("extractTransactionInfoFromText called but no flow is implemented.");
    return { description: input.text, amount: 0, type: 'expense', category: 'Outros', paymentMethod: 'one-time' };
}

export async function extractMultipleTransactions(input: ExtractMultipleTransactionsInput): Promise<ExtractMultipleTransactionsOutput> {
    console.warn("extractMultipleTransactions called but no flow is implemented.");
    return { transactions: [] };
}

export async function runAnalysis(input: GenerateFinancialAnalysisInput): Promise<GenerateFinancialAnalysisOutput> {
    // const result = await runFlow(generateFinancialAnalysisFlow, input);
    // return result;
    console.warn("runAnalysis called but no flow is implemented.");
    return { healthStatus: 'Atenção', diagnosis: 'A análise está temporariamente indisponível.', suggestions: [] };
}

export async function runFileExtraction(input: ExtractFromFileInput): Promise<ExtractFromFileOutput> {
    console.warn("runFileExtraction called but no flow is implemented.");
    return { transactions: [] };
}

export async function runInvestorProfileAnalysis(input: InvestorProfileInput): Promise<InvestorProfileOutput> {
    console.warn("runInvestorProfileAnalysis called but no flow is implemented.");
    return { profile: 'Moderado', analysis: 'Análise indisponível.', assetAllocation: [], recommendations: [], expectedReturn: 'N/A' };
}

export async function runSavingsGoalCalculation(input: SavingsGoalInput): Promise<SavingsGoalOutput> {
    console.warn("runSavingsGoalCalculation called but no flow is implemented.");
    return { monthlyIncome: 0, currentExpenses: 0, savingCapacity: 0, recommendedGoal: 0, recommendedPercentage: 0 };
}

export async function runGoalMediation(input: MediateGoalsInput): Promise<MediateGoalsOutput> {
    console.warn("runGoalMediation called but no flow is implemented.");
    const fallbackPlan = {
        partnerAPortion: 0,
        partnerBPortion: 0,
        unallocated: 0,
        partnerANewMonths: input.partnerAGoal.months,
        partnerBNewMonths: input.partnerBGoal.months,
    };
    return { summary: 'Análise indisponível.', jointPlan: fallbackPlan, analysis: '', actionSteps: [] };
}

export async function runImageExtraction(input: ExtractFromImageInput): Promise<ExtractFromImageOutput> {
    console.warn("runImageExtraction called but no flow is implemented.");
    return { description: 'Não foi possível ler a imagem', amount: 0, type: 'expense', category: 'Outros', paymentMethod: 'one-time' };
}
