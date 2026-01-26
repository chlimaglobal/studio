'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  addStoredTransaction,
  deleteStoredTransaction,
  initializeUser,
  onTransactionsUpdate,
  onUserSubscriptionUpdate,
  updateStoredTransaction,
  onChatUpdate,
  updateTransactionCategory
} from '@/lib/storage';
import { getCategorySuggestion } from '@/app/dashboard/actions';
import { Toaster } from "@/components/ui/toaster";
import type { Transaction, TransactionFormSchema, ChatMessage, AppUser } from '@/types';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useCoupleStore, initializeCoupleStore } from '@/hooks/use-couple-store';

/* ===================== AUTH CONTEXT ===================== */

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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await initializeUser(user);
        initializeCoupleStore(user);
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

/* ===================== SUBSCRIPTION CONTEXT ===================== */

interface SubscriptionContextType {
  isSubscribed: boolean;
  isLoading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isSubscribed: false,
  isLoading: true
});

export function useSubscription() {
  return useContext(SubscriptionContext);
}

function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ FIX: email admin corrigido
  const isAdmin = user?.email === 'digitalacademyoficial@gmail.com';

  useEffect(() => {
    if (isAdmin) {
      setIsSubscribed(true);
      setIsLoading(false);
      return;
    }

    if (!user) {
      setIsSubscribed(false);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onUserSubscriptionUpdate(user.uid, (status) => {
      setIsSubscribed(status === 'active' || status === 'trialing');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  return (
    <SubscriptionContext.Provider value={{ isSubscribed, isLoading }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

/* ===================== COUPLE CONTEXT ===================== */

type ViewMode = 'separate' | 'together';

interface CoupleContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  partnerData: AppUser | null;
}

const CoupleContext = createContext<CoupleContextType | undefined>(undefined);

export function useViewMode() {
  const context = useContext(CoupleContext);
  if (!context) throw new Error('useViewMode must be used within CoupleProvider');
  return context;
}

function CoupleProvider({ children }: { children: React.ReactNode }) {
  const { partner } = useCoupleStore();
  const [viewMode, setViewModeInternal] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('viewMode') as ViewMode) || 'separate';
    }
    return 'separate';
  });

  const setViewMode = (mode: ViewMode) => {
    setViewModeInternal(mode);
    localStorage.setItem('viewMode', mode);
  };

  return (
    <CoupleContext.Provider value={{ viewMode, setViewMode, partnerData: partner }}>
      {children}
    </CoupleContext.Provider>
  );
}

/* ===================== TRANSACTIONS CONTEXT ===================== */

interface TransactionsContextType {
  transactions: Transaction[];
  addTransaction: (
    data: z.infer<typeof TransactionFormSchema> | z.infer<typeof TransactionFormSchema>[]
  ) => Promise<void>;
  updateTransaction: (id: string, data: z.infer<typeof TransactionFormSchema>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  isLoading: boolean;
  isBatchProcessing: boolean;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export function useTransactions() {
  const context = useContext(TransactionsContext);
  if (!context) throw new Error('useTransactions must be used within TransactionsProvider');
  return context;
}

function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const { viewMode, partnerData } = useViewMode();
  const { isSubscribed, isLoading: subLoading } = useSubscription();

  // ✅ FIX: email admin corrigido
  const isAdmin = user?.email === 'digitalacademyoficial@gmail.com';

  useEffect(() => {
    if (!user?.uid) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let userTxs: Transaction[] = [];
    let partnerTxs: Transaction[] = [];

    const unsubUser = onTransactionsUpdate(user.uid, (txs) => {
      userTxs = txs;
      const all =
        viewMode === 'together' && partnerData?.uid
          ? [...userTxs, ...partnerTxs]
          : userTxs;

      setTransactions(
        all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
      setIsLoading(false);
    });

    let unsubPartner: (() => void) | null = null;

    if (viewMode === 'together' && partnerData?.uid) {
      unsubPartner = onTransactionsUpdate(partnerData.uid, (txs) => {
        partnerTxs = txs;
        setTransactions(
          [...userTxs, ...partnerTxs].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )
        );
      });
    }

    return () => {
      unsubUser();
      if (unsubPartner) unsubPartner();
    };
  }, [user?.uid, viewMode, partnerData]);

  const addTransaction = useCallback(async (
    data: z.infer<typeof TransactionFormSchema> | z.infer<typeof TransactionFormSchema>[]
  ) => {

    // ✅ FIX: evita falha silenciosa
    if (authLoading) return;

    if (!user?.uid) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Você precisa estar logado.'
      });
      return;
    }

    const txs = Array.isArray(data) ? data : [data];
    const isBatch = txs.length > 1;
    if (isBatch) setIsBatchProcessing(true);

    try {
      const newTxInfo = await addStoredTransaction(txs, user.uid);

      const trx = txs[0];
      toast({
        title: trx.type === 'income' ? 'Receita adicionada!' : 'Despesa adicionada!',
        description: `${trx.description} - ${formatCurrency(trx.amount)}`
      });

      // ✅ FIX FINAL: IA só roda se permissão ESTÁVEL
      if (!subLoading && (isSubscribed || isAdmin)) {
        newTxInfo.forEach(tx => {
          if (!tx.category || tx.category === 'Outros') {
            (async () => {
              try {
                const suggestion = await getCategorySuggestion({ description: tx.description });
                if (suggestion.category && suggestion.category !== 'Outros') {
                  await updateTransactionCategory(user.uid, tx.id, suggestion.category);
                }
              } catch {
                // silêncio total
              }
            })();
          }
        });
      }

    } finally {
      if (isBatch) setIsBatchProcessing(false);
    }
  }, [user, authLoading, isSubscribed, isAdmin, subLoading, toast]);

  const updateTransaction = async (id: string, data: z.infer<typeof TransactionFormSchema>) => {
    if (!user?.uid) return;
    await updateStoredTransaction(user.uid, id, data);
  };

  const deleteTransaction = async (id: string) => {
    if (!user?.uid) return;
    await deleteStoredTransaction(user.uid, id);
  };

  return (
    <TransactionsContext.Provider value={{
      transactions,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      isLoading,
      isBatchProcessing
    }}>
      {children}
    </TransactionsContext.Provider>
  );
}

/* ===================== LUMINA CONTEXT ===================== */

interface LuminaContextType {
  hasUnread: boolean;
  setHasUnread: React.Dispatch<React.SetStateAction<boolean>>;
}

const LuminaContext = createContext<LuminaContextType | undefined>(undefined);

export function useLumina() {
  const context = useContext(LuminaContext);
  if (!context) throw new Error('useLumina must be used within LuminaProvider');
  return context;
}

function LuminaProvider({ children }: { children: React.ReactNode }) {
  const [hasUnread, setHasUnread] = useState(false);
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const pathname = usePathname();

  const isAdmin = user?.email === 'digitalacademyoficial@gmail.com';

  useEffect(() => {
    if (!user || (!isSubscribed && !isAdmin)) return;

    const unsubscribe = onChatUpdate(user.uid, (messages: ChatMessage[]) => {
      if (!messages.length) return;
      const last = messages[messages.length - 1];
      if (last.authorId !== user.uid && pathname !== '/dashboard/lumina') {
        setHasUnread(true);
      }
    });

    return () => unsubscribe();
  }, [user, isSubscribed, isAdmin, pathname]);

  return (
    <LuminaContext.Provider value={{ hasUnread, setHasUnread }}>
      {children}
    </LuminaContext.Provider>
  );
}

/* ===================== APP PROVIDERS ===================== */

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system">
      <AuthProvider>
        <SubscriptionProvider>
          <CoupleProvider>
            <TransactionsProvider>
              <LuminaProvider>
                {children}
                <Toaster />
              </LuminaProvider>
            </TransactionsProvider>
          </CoupleProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export { useCoupleStore };
