
'use server';

import { categorizeTransaction } from "@/ai/flows/categorize-transaction";
import { extractTransactionFromText } from "@/ai/flows/extract-transaction-from-text";
import { TransactionCategory, transactionCategories } from "@/lib/types";
import { getAuth } from "firebase-admin/auth";
import { adminApp, adminDb } from "@/lib/firebase-admin";

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
    console.error("Lúmina suggestion failed:", e);
    // Fail silently on the UI, but log the error.
    return { category: null, error: 'Falha ao obter sugestão da Lúmina.' };
  }
}

export async function getPartnerId(userId: string): Promise<string | null> {
    if (!adminDb) {
        console.error("O banco de dados do administrador não foi inicializado.");
        return null;
    }
    if (!userId) {
        console.error("userId não fornecido para getPartnerId.");
        return null;
    }

    try {
        const sharedAccountsRef = adminDb.collection('users').doc(userId).collection('sharedAccounts');
        const querySnapshot = await sharedAccountsRef.limit(1).get();

        if (querySnapshot.empty) {
            const ownedAccountsRef = adminDb.collection('users').doc(userId).collection('accounts');
            const ownedQuerySnapshot = await ownedAccountsRef.where('isShared', '==', true).limit(1).get();
            
            if (ownedQuerySnapshot.empty) {
                return null;
            }

            const accountData = ownedQuerySnapshot.docs[0].data();
            const partnerId = accountData.memberIds.find((id: string) => id !== userId);
            return partnerId || null;
        }

        const sharedAccountData = querySnapshot.docs[0].data();
        return sharedAccountData.ownerId || null;
    } catch (error) {
        console.error("Erro ao buscar ID do parceiro:", error);
        return null;
    }
}
