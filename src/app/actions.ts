'use server';

import { categorizeTransaction } from "@/ai/flows/categorize-transaction";
import { transactionCategories, Transaction, TransactionCategory, TransactionFormSchema } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Simulating a database in memory
const mockTransactions: Transaction[] = [
    {
      id: 'txn_1',
      date: new Date('2024-07-15'),
      description: 'Depósito de Salário',
      amount: 5000,
      type: 'income',
      category: 'Salário',
    },
    {
      id: 'txn_bonus_1',
      date: new Date('2024-07-20'),
      description: 'Bônus de Performance',
      amount: 1200,
      type: 'income',
      category: 'Bônus',
    },
     {
      id: 'txn_commission_1',
      date: new Date('2024-07-25'),
      description: 'Comissão de Vendas',
      amount: 850,
      type: 'income',
      category: 'Comissão',
    },
    {
      id: 'txn_2',
      date: new Date('2024-07-16'),
      description: 'Compras de supermercado no Pão de Açúcar',
      amount: 350.75,
      type: 'expense',
      category: 'Supermercado',
    },
    {
      id: 'txn_3',
      date: new Date('2024-07-17'),
      description: 'Aluguel Mensal',
      amount: 1800,
      type: 'expense',
      category: 'Contas',
    },
    {
      id: 'txn_4',
      date: new Date('2024-07-18'),
      description: 'Jantar no restaurante italiano',
      amount: 120,
      type: 'expense',
      category: 'Restaurante',
    },
    {
      id: 'txn_5',
      date: new Date('2024-07-20'),
      description: 'Mensalidade Netflix',
      amount: 45.9,
      type: 'expense',
      category: 'Assinaturas',
    },
    {
      id: 'txn_6',
      date: new Date('2024-07-22'),
      description: 'Gasolina para o carro',
      amount: 155.2,
      type: 'expense',
      category: 'Gasolina',
    },
      {
      id: 'txn_7',
      date: new Date('2024-06-15'),
      description: 'Depósito de Salário',
      amount: 5000,
      type: 'income',
      category: 'Salário',
    },
      {
      id: 'txn_8',
      date: new Date('2024-06-20'),
      description: 'Investimento em Ações',
      amount: 1000,
      type: 'expense',
      category: 'Investimentos',
    },
    {
      id: 'txn_9',
      date: new Date('2024-06-25'),
      description: 'Conta de Internet',
      amount: 99.9,
      type: 'expense',
      category: 'Internet',
    },
    {
      id: 'txn_10',
      date: new Date('2024-07-01'),
      description: 'Conta de Luz',
      amount: 150.0,
      type: 'expense',
      category: 'Luz',
    },
    {
      id: 'txn_11',
      date: new Date('2024-07-05'),
      description: 'Conta de Água',
      amount: 80.5,
      type: 'expense',
      category: 'Água',
    },
  ];


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
        return { success: true, message: "Transação adicionada com sucesso!" };
    } catch(error) {
        console.error("Failed to add transaction:", error);
        return { success: false, message: "Falha ao adicionar transação."};
    }
}
