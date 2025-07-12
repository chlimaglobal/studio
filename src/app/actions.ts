'use server';

import { categorizeTransaction } from "@/ai/flows/categorize-transaction";
import { transactionCategories, TransactionCategory } from "@/lib/types";

export async function getCategorySuggestion(description: string): Promise<{ category: TransactionCategory | null, error: string | null }> {
  if (!description) {
    return { category: null, error: 'Description cannot be empty.' };
  }

  try {
    const result = await categorizeTransaction({ description });
    if (result.category && transactionCategories.includes(result.category)) {
      return { category: result.category, error: null };
    }
    return { category: null, error: 'Could not determine a valid category.' };
  } catch (e) {
    console.error(e);
    return { category: null, error: 'Failed to get suggestion from AI.' };
  }
}
