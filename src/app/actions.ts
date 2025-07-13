
'use server';

import { categorizeTransaction } from "@/ai/flows/categorize-transaction";
import { extractTransactionFromText } from "@/ai/flows/extract-transaction-from-text";
import { TransactionCategory, transactionCategories } from "@/lib/types";

export async function extractTransactionInfoFromText(text: string) {
  if (!text) {
    return { error: 'O texto não pode estar vazio.' };
  }

  try {
    const result = await extractTransactionFromText({ text });
    if (result && result.amount && result.description && result.type) {
      const transactionData = {
        description: result.description,
        amount: result.amount,
        type: result.type,
        date: new Date(),
        category: result.category,
      };
      
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
