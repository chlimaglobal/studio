
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import BottomNavBar from '@/components/bottom-nav-bar';
import { AddTransactionFab } from '@/components/add-transaction-fab';
import type { Transaction } from '@/lib/types';
import { addStoredTransaction, onTransactionsUpdate } from '@/lib/storage';
import { z } from 'zod';
import type { TransactionFormSchema } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';

// 1. Create a context
interface TransactionsContextType {
  transactions: Transaction[];
  addTransaction: (data: z.infer<typeof TransactionFormSchema>) => void;
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

  const isUnusualSpending = (newAmount: number, category: any): boolean => {
    const historicalTransactions = transactions.filter(
      t => t.category === category && t.type === 'expense'
    );
    if (historicalTransactions.length < 3) return false;
    const total = historicalTransactions.reduce((acc, t) => acc + t.amount, 0);
    const average = total / historicalTransactions.length;
    return newAmount > average * 1.3 && average > 50;
  };
  
  const playNotificationSound = (type: 'income' | 'expense') => {
    if (typeof window === 'undefined') return;
    const soundKey = type === 'income' ? 'incomeSound' : 'expenseSound';
    const soundFile = localStorage.getItem(soundKey);
    if (soundFile && soundFile !== 'none') {
        try {
            const audio = new Audio(`/${soundFile}`);
            audio.play().catch(e => console.error("Error playing sound:", e));
        } catch (e) {
            console.error("Failed to play notification sound:", e);
        }
    }
  };

  const addTransaction = useCallback(async (data: z.infer<typeof TransactionFormSchema>) => {
    // Now an async function that adds to Firestore
    await addStoredTransaction(data); 
    
    playNotificationSound(data.type);

    if (data.type === 'income') {
         toast({
            title: '🎉 Receita Adicionada!',
            description: "Ótimo trabalho! Continue investindo no seu futuro."
        });
    } else if (data.type === 'expense') {
        if (isUnusualSpending(data.amount, data.category)) {
             toast({
                variant: 'destructive',
                title: '🚨 Gasto Incomum Detectado!',
                description: `Seu gasto em "${data.category}" está acima da sua média.`,
                action: <AlertTriangle className="h-5 w-5" />,
            });
        } else {
             toast({
                title: '💸 Despesa Adicionada',
                description: `"${data.description}" adicionado. Lembre-se de manter o controle.`
            });
        }
    }
  }, [toast, transactions]); //eslint-disable-line

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
