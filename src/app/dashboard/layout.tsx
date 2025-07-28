
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import BottomNavBar from '@/components/bottom-nav-bar';
import { AddTransactionFab } from '@/components/add-transaction-fab';
import type { Transaction } from '@/lib/types';
import { addStoredTransaction, deleteStoredTransactions, onTransactionsUpdate } from '@/lib/storage';
import { z } from 'zod';
import type { TransactionFormSchema } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';
import { sendWhatsAppNotification } from '../actions';
import { formatCurrency } from '@/lib/utils';
import { addMonths } from 'date-fns';

// 1. Create a context
interface TransactionsContextType {
  transactions: Transaction[];
  addTransaction: (data: z.infer<typeof TransactionFormSchema>) => Promise<void>;
  isLoading: boolean;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

// 2. Create a hook for easy consumption
export function useTransactions() {
  const context = useContext(TransactionsContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionsProvider');
  }
  return context;
}


// 3. Create the Provider component
function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    // onTransactionsUpdate will call the callback with initial data and then with any updates.
    const unsubscribe = onTransactionsUpdate((newTransactions) => {
      setTransactions(newTransactions);
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);
  
  const addTransaction = useCallback(async (data: z.infer<typeof TransactionFormSchema>) => {
    try {
        await addStoredTransaction(data);
        const userWhatsAppNumber = localStorage.getItem('userWhatsApp');
        if (userWhatsAppNumber) {
            const messageType = data.type === 'income' ? 'Receita' : 'Despesa';
            const messageBody = `Nova ${messageType} de ${formatCurrency(data.amount)} (${data.description}) registrada pelo app.`;
            sendWhatsAppNotification(messageBody, userWhatsAppNumber);
        }

    } catch (error) {
        console.error("Failed to save transaction:", error);
        toast({
            variant: 'destructive',
            title: 'Erro ao Salvar Transação',
            description: "Não foi possível salvar a transação no banco de dados. Tente novamente.",
        });
        // Re-throw the error to be caught by the form's onSubmit handler
        throw error;
    }
  }, [toast]);


  return (
    <TransactionsContext.Provider value={{ transactions, addTransaction, isLoading }}>
      {children}
    </TransactionsContext.Provider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TransactionsProvider>
        <div className="flex flex-col min-h-screen w-full bg-background relative">
          <main className="flex-1 overflow-y-auto pb-24 p-4">
            {children}
          </main>
          <AddTransactionFab />
          <BottomNavBar />
        </div>
    </TransactionsProvider>
  );
}
