
'use server';

import { categorizeTransaction } from "@/ai/flows/categorize-transaction";
import { extractTransactionFromText } from "@/ai/flows/extract-transaction-from-text";
import { TransactionCategory, transactionCategories, ExtractTransactionOutput } from "@/lib/types";


export async function extractTransactionInfoFromText(text: string) {
  if (!text) {
    return { error: 'O texto não pode estar vazio.' };
  }

  try {
    const result: ExtractTransactionOutput = await extractTransactionFromText({ text });
    if (result && result.description && result.type) {
      const transactionData = {
        description: result.description,
        amount: result.amount,
        type: result.type,
        date: new Date(),
        category: result.category,
        paymentMethod: result.paymentMethod,
        installments: result.installments,
      };
      
      return transactionData;
    }
    // This case handles when the AI runs successfully but fails to extract all required fields.
    return { error: 'Não foi possível extrair os detalhes da transação. Tente ser mais claro, por exemplo: "gastei 50 reais no almoço".' };
  } catch (e: any) {
    console.error("Lumina extraction failed:", e);
    // This case handles a complete failure of the AI flow (e.g., network error, API key issue).
    return { error: 'A Lúmina não conseguiu processar sua solicitação agora. Por favor, tente novamente.' };
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
    // If the category is invalid or not returned, fail silently without user-facing error.
    console.warn(`Lúmina returned invalid or no category for: "${description}"`);
    return { category: null, error: 'Não foi possível determinar uma categoria válida.' };
  } catch (e) {
    console.error("Lumina suggestion failed:", e);
    // Fail silently on the UI, but log the error.
    return { category: null, error: 'Falha ao obter sugestão da Lúmina.' };
  }
}
