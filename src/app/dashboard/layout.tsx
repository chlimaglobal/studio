
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import BottomNavBar from '@/components/bottom-nav-bar';
import { AddTransactionFab } from '@/components/add-transaction-fab';
import type { Transaction } from '@/lib/types';
import { addStoredTransaction, onTransactionsUpdate, initializeUser, deleteStoredTransaction, updateStoredTransaction } from '@/lib/storage';
import { z } from 'zod';
import type { TransactionFormSchema } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { sendWhatsAppNotification } from '../actions';
import { formatCurrency } from '@/lib/utils';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { app } from '@/lib/firebase';

// 1. Auth Context
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}
const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true });

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        // Initialize user document in Firestore on login
        initializeUser(user);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}


// 2. Transactions Context
interface TransactionsContextType {
  transactions: Transaction[];
  addTransaction: (data: z.infer<typeof TransactionFormSchema>) => Promise<void>;
  updateTransaction: (id: string, data: z.infer<typeof TransactionFormSchema>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  isLoading: boolean;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export function useTransactions() {
  const context = useContext(TransactionsContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionsProvider');
  }
  return context;
}

// 3. Provider Component
function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      const unsubscribe = onTransactionsUpdate(user.uid, (newTransactions) => {
        setTransactions(newTransactions);
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else {
      // If no user, clear transactions and stop loading.
      setTransactions([]);
      setIsLoading(false);
    }
  }, [user]);
  
  const addTransaction = useCallback(async (data: z.infer<typeof TransactionFormSchema>) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado para adicionar uma transação.' });
      throw new Error("User not authenticated");
    }
    
    try {
        await addStoredTransaction(user.uid, data);
        const userWhatsAppNumber = localStorage.getItem('userWhatsApp');
        if (userWhatsAppNumber) {
            const messageType = data.type === 'income' ? 'Receita' : 'Despesa';
            const messageBody = `Nova ${messageType} de ${formatCurrency(data.amount)} (${data.description}) registrada pelo app.`;
            // Do not await this, let it run in the background
            sendWhatsAppNotification(messageBody, userWhatsAppNumber);
        }

    } catch (error) {
        console.error("Failed to save transaction:", error);
        toast({
            variant: 'destructive',
            title: 'Erro ao Salvar Transação',
            description: "Não foi possível salvar a transação no banco de dados. Tente novamente.",
        });
        throw error;
    }
  }, [toast, user]);

  const updateTransaction = useCallback(async (id: string, data: z.infer<typeof TransactionFormSchema>) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado.' });
      throw new Error("User not authenticated");
    }
    try {
      await updateStoredTransaction(user.uid, id, data);
    } catch (error) {
      console.error("Failed to update transaction:", error);
      toast({ variant: 'destructive', title: 'Erro ao Atualizar', description: "Não foi possível atualizar a transação." });
      throw error;
    }
  }, [toast, user]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado.' });
      throw new Error("User not authenticated");
    }
    try {
      await deleteStoredTransaction(user.uid, id);
    } catch (error) {
      console.error("Failed to delete transaction:", error);
      toast({ variant: 'destructive', title: 'Erro ao Excluir', description: "Não foi possível excluir a transação." });
      throw error;
    }
  }, [toast, user]);

  return (
    <TransactionsContext.Provider value={{ transactions, addTransaction, updateTransaction, deleteTransaction, isLoading }}>
      {children}
    </TransactionsContext.Provider>
  );
}

// Main Layout Component
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <TransactionsProvider>
        <DashboardLayoutContent>
          {children}
        </DashboardLayoutContent>
      </TransactionsProvider>
    </AuthProvider>
  );
}


function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If auth is done loading and there's no user, redirect to login
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);


  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Carregando dados do usuário...</p>
      </div>
    );
  }

  return (
      <div className="flex flex-col min-h-screen w-full bg-background relative">
        <main className="flex-1 overflow-y-auto pb-24 p-4">
          {children}
        </main>
        <AddTransactionFab />
        <BottomNavBar />
      </div>
  );
}
