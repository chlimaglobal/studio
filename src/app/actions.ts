'use server';

import { categorizeTransaction } from "@/ai/flows/categorize-transaction";
import { transactionCategories, TransactionCategory } from "@/lib/types";

export async function getCategorySuggestion(description: string): Promise<{ category: TransactionCategory | null, error: string | null }> {
  if (!description) {
    return { category: null, error: 'A descrição não pode estar vazia.' };
  }

  try {
    const result = await categorizeTransaction({ description });
    if (result.category && transactionCategories.includes(result.category)) {
      return { category: result.category, error: null };
    }
    return { category: null, error: 'Não foi possível determinar uma categoria válida.' };
  } catch (e) {
    console.error(e);
    return { category: null, error: 'Falha ao obter sugestão da IA.' };
  }
}
