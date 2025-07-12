'use server';

import { categorizeTransaction } from "@/ai/flows/categorize-transaction";
import { extractTransactionFromText } from "@/ai/flows/extract-transaction-from-text";
import { transactionCategories, Transaction, TransactionCategory, TransactionFormSchema } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Simulating a database in memory
const mockTransactions: Transaction[] = [];

export async function extractTransactionInfoFromText(text: string): Promise<Partial<z.infer<typeof TransactionFormSchema>> | { error: string }> {
  if (!text) {
    return { error: 'O texto não pode estar vazio.' };
  }

  try {
    const result = await extractTransactionFromText({ text });
    if (result && result.amount && result.description && result.type) {
      const transactionData: Partial<z.infer<typeof TransactionFormSchema>> = {
        description: result.description,
        amount: result.amount,
        type: result.type,
        date: new Date(),
      };
      
      // Se a IA já sugeriu uma categoria, use-a.
      if (result.category) {
        transactionData.category = result.category;
      }

      return transactionData;
    }
    return { error: 'Não foi possível extrair os detalhes da transação.' };
  } catch (e) {
    console.error(e);
    return { error: 'Falha ao processar o comando de voz com a IA.' };
  }
}


export async function getCategorySuggestion(description: string): Promise<{ category: TransactionCategory | null, error: string | null }> {
  if (!description) {
    return { category: null, error: 'A descrição não pode estar vazia.' };
  }

  try {
    const result = await categorizeTransaction({ description });
    // @ts-ignore
    if (result.category && transactionCategories.includes(result.category)) {
      // @ts-ignore
      return { category: result.category, error: null };
    }
    return { category: null, error: 'Não foi possível determinar uma categoria válida.' };
  } catch (e) {
    console.error(e);
    return { category: null, error: 'Falha ao obter sugestão da IA.' };
  }
}

export async function getTransactions(): Promise<Transaction[]> {
    // In a real app, you'd fetch this from a database.
    return Promise.resolve(mockTransactions.sort((a, b) => b.date.getTime() - a.date.getTime()));
}

export async function addTransaction(data: z.infer<typeof TransactionFormSchema>) {
    try {
        const newTransaction: Transaction = {
            id: `txn_${Date.now()}`,
            ...data
        };
        mockTransactions.unshift(newTransaction);
        revalidatePath('/dashboard'); // This tells Next.js to refresh the data on the dashboard page
        
        const isExcessiveExpense = data.type === 'expense' && data.amount > 1000;

        return { 
            success: true, 
            message: "Transação adicionada com sucesso!",
            notification: {
                type: data.type,
                isExcessive: isExcessiveExpense
            }
        };
    } catch(error) {
        console.error("Failed to add transaction:", error);
        return { 
            success: false, 
            message: "Falha ao adicionar transação."
        };
    }
}
