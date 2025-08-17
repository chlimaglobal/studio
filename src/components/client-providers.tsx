
'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from '@/lib/firebase';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  addStoredTransaction, 
  deleteStoredTransaction, 
  initializeUser, 
  onTransactionsUpdate, 
  onUserSubscriptionUpdate, 
  updateStoredTransaction,
  onChatUpdate 
} from '@/lib/storage';
import { Toaster } from "@/components/ui/toaster";
import type { Transaction, TransactionFormSchema, ChatMessage } from '@/lib/types';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { sendWhatsAppNotification } from '@/app/actions';
import { usePathname } from 'next/navigation';

// 1. Auth Context
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}
const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true });

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// 2. Subscription Context
interface SubscriptionContextType {
  isSubscribed: boolean;
  isLoading: boolean;
}
const SubscriptionContext = createContext<SubscriptionContextType>({ isSubscribed: false, isLoading: true });

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

// 3. Transactions Context
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

// 4. Mural Unread Context
interface MuralContextType {
  hasUnread: boolean;
  setHasUnread: React.Dispatch<React.SetStateAction<boolean>>;
}
const MuralContext = createContext<MuralContextType | undefined>(undefined);

export function useMural() {
    const context = useContext(MuralContext);
    if (context === undefined) {
        throw new Error('useMural must be used within a ClientProviders');
    }
    return context;
}

// PROVIDER COMPONENTS

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await initializeUser(user);
        setUser(user);
      } else {
        setUser(null);
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

function SubscriptionProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const isAdmin = user?.email === 'digitalacademyoficiall@gmail.com';

    useEffect(() => {
        if (isAdmin) {
            setIsSubscribed(true);
            setIsLoading(false);
            return;
        }
        if (user) {
            const unsubscribe = onUserSubscriptionUpdate(user.uid, (status) => {
                setIsSubscribed(status === 'active' || status === 'trialing');
                setIsLoading(false);
            });
            return () => unsubscribe();
        } else {
            setIsSubscribed(false);
            setIsLoading(false);
        }
    }, [user, isAdmin]);

    return (
        <SubscriptionContext.Provider value={{ isSubscribed, isLoading }}>
            {children}
        </SubscriptionContext.Provider>
    );
}

function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.uid) {
      setIsLoading(true);
      const unsubscribe = onTransactionsUpdate(user.uid, (newTransactions) => {
        setTransactions(newTransactions);
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else if (!user) {
      // If no user, clear transactions and stop loading.
      setTransactions([]);
      setIsLoading(false);
    }
  }, [user]);

  const playSound = useCallback((soundFile: string) => {
    if (!soundFile || soundFile === 'none' || typeof window === 'undefined') return;
    try {
      const audio = new Audio(`/${soundFile}`);
      audio.play().catch(e => console.error("Error playing sound:", e));
    } catch (e) {
      console.error("Failed to play audio:", e);
    }
  }, []);
  
  const addTransaction = useCallback(async (data: z.infer<typeof TransactionFormSchema>) => {
    const userId = user?.uid;
    if (!userId) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado para adicionar uma transação.' });
      throw new Error("User not authenticated");
    }
    
    try {
        await addStoredTransaction(userId, data);

        const messageType = data.type === 'income' ? 'Receita' : 'Despesa';
        toast({
            title: `${messageType} adicionada!`,
            description: `${data.description} - ${formatCurrency(data.amount)}`,
        });

        // Play sound based on transaction type
        const soundToPlay = data.type === 'income'
          ? localStorage.getItem('incomeSound') || 'cash-register.mp3'
          : localStorage.getItem('expenseSound') || 'swoosh.mp3';
        playSound(soundToPlay);

        const userWhatsAppNumber = localStorage.getItem('userWhatsApp');
        if (userWhatsAppNumber) {
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
  }, [toast, user, playSound]);

  const updateTransaction = useCallback(async (id: string, data: z.infer<typeof TransactionFormSchema>) => {
    const userId = user?.uid;
    if (!userId) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado.' });
      throw new Error("User not authenticated");
    }
    try {
      await updateStoredTransaction(userId, id, data);
    } catch (error) {
      console.error("Failed to update transaction:", error);
      toast({ variant: 'destructive', title: 'Erro ao Atualizar', description: "Não foi possível atualizar a transação." });
      throw error;
    }
  }, [toast, user]);

  const deleteTransaction = useCallback(async (id: string) => {
    const userId = user?.uid;
    if (!userId) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado.' });
      throw new Error("User not authenticated");
    }
    try {
      await deleteStoredTransaction(userId, id);
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

function MuralProvider({ children }: { children: React.ReactNode }) {
    const [hasUnread, setHasUnread] = useState(false);
    const { user } = useAuth();
    const pathname = usePathname();
    const { isSubscribed } = useSubscription();
    const isAdmin = user?.email === 'digitalacademyoficiall@gmail.com';

    useEffect(() => {
        if (pathname === '/dashboard/mural') {
            // When user enters the mural, mark as read and store timestamp
            setHasUnread(false);
            localStorage.setItem('lastMuralVisit', new Date().toISOString());
        }
    }, [pathname]);

    useEffect(() => {
        if (user && (isSubscribed || isAdmin)) {
            const unsubscribe = onChatUpdate(user.uid, (messages) => {
                const latestMessage = messages[messages.length - 1];
                if (!latestMessage) return;

                const lastVisitString = localStorage.getItem('lastMuralVisit');
                const lastVisit = lastVisitString ? new Date(lastVisitString) : new Date(0);
                
                // Show notification only if the last message is from someone else,
                // is newer than the last visit, and the user is not currently on the mural page.
                if (latestMessage.role !== 'user' && 
                    new Date(latestMessage.timestamp) > lastVisit && 
                    pathname !== '/dashboard/mural') {
                    setHasUnread(true);
                }
            });
            return () => unsubscribe();
        }
    }, [user, isSubscribed, isAdmin, pathname]);

    return (
        <MuralContext.Provider value={{ hasUnread, setHasUnread }}>
            {children}
        </MuralContext.Provider>
    );
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <SubscriptionProvider>
              <TransactionsProvider>
                <MuralProvider>
                    {children}
                    <Toaster />
                </MuralProvider>
              </TransactionsProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </ThemeProvider>
    )
}
