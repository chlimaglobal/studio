
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
      const filteredTransactions = newTransactions.filter(t => !t.hideFromReports);
      setTransactions(filteredTransactions);
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
    playNotificationSound(data.type);

    let tempIds: string[] = [];
    
    // --- Optimistic UI Update ---
    if (data.type === 'expense' && data.paymentMethod === 'installments' && data.installments && data.installments > 1) {
        const installmentAmount = data.amount / data.installments;
        const newTransactions: Transaction[] = [];
        for (let i = 0; i < data.installments; i++) {
            const tempId = `temp_${Date.now()}_${i}`;
            tempIds.push(tempId);
            newTransactions.push({
                id: tempId,
                ...data,
                date: addMonths(new Date(data.date), i).toISOString(),
                amount: Number(installmentAmount.toFixed(2)),
                description: `${data.description} (${i + 1}/${data.installments})`,
                paid: i === 0 ? data.paid : false,
                installmentNumber: i + 1,
                totalInstallments: data.installments,
            });
        }
        setTransactions(current => [...newTransactions, ...current].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } else {
        const tempId = `temp_${Date.now()}`;
        tempIds.push(tempId);
        const newTransaction: Transaction = {
            id: tempId,
            ...data,
            date: new Date(data.date).toISOString(),
        };
        setTransactions(current => [newTransaction, ...current].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }


    try {
      // Send to server in the background
      await addStoredTransaction(data); 

      // Show toast on success
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

      // Send WhatsApp notification in background without awaiting
      const userWhatsAppNumber = localStorage.getItem('userWhatsApp');
      if (userWhatsAppNumber) {
          const messageType = data.type === 'income' ? 'Receita' : 'Despesa';
          const messageBody = `Nova ${messageType} de ${formatCurrency(data.amount)} (${data.description}) registrada pelo app.`;
          sendWhatsAppNotification(messageBody, userWhatsAppNumber);
      }

    } catch (error) {
      // --- Revert UI on error ---
      console.error("Failed to save transaction, reverting UI:", error);
      setTransactions(current => current.filter(t => !tempIds.includes(t.id)));
      toast({
          variant: 'destructive',
          title: 'Erro ao Salvar Transação',
          description: "Não foi possível salvar a transação. Por favor, tente novamente.",
      });
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
