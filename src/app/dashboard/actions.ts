
'use server';

import { runFlow } from "genkit";
import { categorizeTransaction } from "@/ai/flows/categorize-transaction";
import { extractTransactionFromText } from "@/ai/flows/extract-transaction-from-text";
import { TransactionCategory, transactionCategories, ExtractTransactionOutput } from "@/lib/types";

export async function extractTransactionInfoFromText(text: string) {
  if (!text) {
    return { error: 'O texto não pode estar vazio.' };
  }

  try {
    const result = await runFlow(extractTransactionFromText, { text });
    if (result && result.amount !== undefined && result.description && result.type) {
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
    return { error: 'Não foi possível extrair os detalhes da transação. Tente ser mais claro, por exemplo: "gastei 50 reais no almoço".' };
  } catch (e: any) {
    console.error("Lumina extraction failed:", e);
    return { error: 'A Lúmina não conseguiu processar sua solicitação agora. Por favor, tente novamente.' };
  }
}

export async function getCategorySuggestion(description: string): Promise<{ category: TransactionCategory | null, error: string | null }> {
  if (!description) {
    return { category: null, error: 'A descrição não pode estar vazia.' };
  }

  try {
    const result = await runFlow(categorizeTransaction, { description });
    if (result.category && transactionCategories.includes(result.category)) {
      return { category: result.category, error: null };
    }
    console.warn(`Lúmina returned invalid or no category for: "${description}"`);
    return { category: null, error: 'Não foi possível determinar uma categoria válida.' };
  } catch (e) {
    console.error("Lumina suggestion failed:", e);
    return { category: null, error: 'Falha ao obter sugestão da Lúmina.' };
  }
}
