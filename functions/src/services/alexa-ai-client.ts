import { run } from 'genkit';
import { DocumentData } from 'firebase-admin/firestore';
import { alexaExtractTransactionFlow, getSimpleFinancialSummaryFlow } from '../flows/alexa-flows';
import { logger } from 'firebase-functions/logger';  // Adicionado para logs melhores (integra com Cloud Logging)
import { startOfMonth, endOfMonth } from 'date-fns';  // Adicionado para filtro por data (instale date-fns)

// Interfaces para tipagem melhor (baseado nos schemas; ajuste conforme '../types')
interface TransactionData {  // Exemplo; ajuste com campos reais
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;  // Assumindo ISO string
  // ... outros campos
}

interface SummaryResult {
  summary: string;
}

/**
 * Invokes the Genkit flow to extract transaction details from a spoken phrase.
 * @param text The phrase spoken by the user to Alexa.
 * @returns The structured transaction data or null if extraction fails.
 */
export async function extractTransactionFromSpeech(text: string): Promise<TransactionData | null> {
    try {
        const result = await run(alexaExtractTransactionFlow, { text });
        return result;
    } catch (error) {
        logger.error("Error running alexaExtractTransactionFlow:", error);  // Atualizado para logger
        return null;
    }
}

/**
 * Invokes the Genkit flow to get a natural language summary of financial data.
 * @param transactions A list of the user's transactions.
 * @param period The period for the summary (default 'month').
 * @returns A string with a natural language summary.
 */
export async function getSummaryFromSpeech(
    transactions: DocumentData[],
    period: 'day' | 'week' | 'month' | 'year' = 'month'  // Adicionado parâmetro flexível
): Promise<string> {
    // Validação se transactions vazio (adicionado para robustez)
    if (!transactions.length) {
        return "Nenhuma transação encontrada para o período.";
    }

    // Filtro por data baseado no período (adicionado para performance; exemplo para 'month')
    const now = new Date();
    let filtered = transactions;
    if (period === 'month') {
        const start = startOfMonth(now);
        const end = endOfMonth(now);
        filtered = transactions.filter(t => {
            const tDate = new Date(t.date);  // Assumindo campo 'date' como ISO string ou timestamp
            return tDate >= start && tDate <= end;
        });
    }  // Adicione lógica para outros períodos (ex: subWeeks para 'week')

    const totalIncome = filtered.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = filtered.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const balance = totalIncome - totalExpense;

    try {
        const result = await run(getSimpleFinancialSummaryFlow, {
            totalIncome,
            totalExpense,
            balance,
            period
        });
        return result.summary;
    } catch (error) {
        logger.error("Error running getSimpleFinancialSummaryFlow:", error);  // Atualizado para logger
        return "Desculpe, não consegui gerar seu resumo financeiro no momento.";
    }
}
