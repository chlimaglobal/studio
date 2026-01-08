
'use client';

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
  onChatUpdate,
  onCoupleChatUpdate,
  addCoupleChatMessage,
} from '@/lib/storage';
import type { Transaction, TransactionFormSchema, ChatMessage, AppUser } from '@/types';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useCoupleStore, initializeCoupleStore } from '@/hooks/use-couple-store';

// 1. Auth Context
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}
const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);
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
        } else if (user === null) {
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

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

// 3. Couple Context
type ViewMode = 'separate' | 'together';
interface CoupleContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  partnerData: AppUser | null;
}
const CoupleContext = createContext<CoupleContextType | undefined>(undefined);

function CoupleProvider({ children }: { children: React.ReactNode }) {
    const { partner } = useCoupleStore();
    const [viewMode, setViewModeInternal] = useState<ViewMode>('separate');
    
    useEffect(() => {
      const storedMode = localStorage.getItem('viewMode') as ViewMode;
      if (storedMode) {
        setViewModeInternal(storedMode);
      }
    }, []);
    
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

export function useViewMode() {
    const context = useContext(CoupleContext);
    if (!context) {
        throw new Error('useViewMode must be used within a CoupleProvider');
    }
    return context;
}


// 4. Transactions Context
interface TransactionsContextType {
  transactions: Transaction[];
  addTransaction: (data: z.infer<typeof TransactionFormSchema> | z.infer<typeof TransactionFormSchema>[]) => Promise<void>;
  updateTransaction: (id: string, data: z.infer<typeof TransactionFormSchema>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  isLoading: boolean;
  isBatchProcessing: boolean;
}
const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { viewMode, partnerData } = useViewMode();
  const { coupleLink } = useCoupleStore();

  useEffect(() => {
    if (!user?.uid) {
      setTransactions([]);
      setIsLoading(false);
      return () => {};
    }

    setIsLoading(true);
    let userTransactions: Transaction[] = [];
    let partnerTransactions: Transaction[] = [];

    const unsubUser = onTransactionsUpdate(user.uid, (newTxs) => {
      userTransactions = newTxs;
      if (viewMode === 'separate' || !partnerData?.uid) {
        setTransactions(userTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } else {
        setTransactions([...userTransactions, ...partnerTransactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }
      setIsLoading(false);
    });

    let unsubPartner: (() => void) | null = null;
    if (viewMode === 'together' && partnerData?.uid) {
      unsubPartner = onTransactionsUpdate(partnerData.uid, (newTxs) => {
        partnerTransactions = newTxs;
        setTransactions([...userTransactions, ...partnerTransactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      });
    }

    return () => {
      unsubUser();
      unsubPartner?.();
    };
  }, [user?.uid, viewMode, partnerData]);


  const playSound = useCallback((soundFile: string) => {
    if (!soundFile || soundFile === 'none' || typeof window === 'undefined') return;
    try {
      const audio = new Audio(`/${soundFile}`);
      audio.play().catch(e => console.error("Error playing sound:", e));
    } catch (e) {
      console.error("Failed to create or play audio:", e);
    }
  }, []);
  
  const addTransaction = useCallback(async (data: z.infer<typeof TransactionFormSchema> | z.infer<typeof TransactionFormSchema>[]) => {
    if (!user?.uid) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado para adicionar uma transação.' });
      throw new Error("User not authenticated");
    }

    const transactionsToAdd = Array.isArray(data) ? data : [data];
    const isBatch = transactionsToAdd.length > 1;

    if (isBatch) setIsBatchProcessing(true);

    try {
        await addStoredTransaction(transactionsToAdd, user.uid);
        if (!isBatch) {
            const trx = transactionsToAdd[0];
            toast({
                title: `${trx.type === 'income' ? 'Receita' : 'Despesa'} adicionada!`,
                description: `${trx.description} - ${formatCurrency(trx.amount)}`,
            });
            const sound = trx.type === 'income' ? localStorage.getItem('incomeSound') : localStorage.getItem('expenseSound');
            playSound(sound || (trx.type === 'income' ? 'cash-register.mp3' : 'swoosh.mp3'));
        } else {
             toast({
                title: `Transações em lote salvas!`,
                description: `${transactionsToAdd.length} novas transações foram adicionadas.`,
            });
             playSound(localStorage.getItem('incomeSound') || 'cash-register.mp3');
        }
    } catch (error) {
        console.error("Failed to save transaction(s):", error);
        toast({ variant: 'destructive', title: 'Erro ao Salvar', description: "Não foi possível salvar as transações." });
        throw error;
    } finally {
        if (isBatch) setIsBatchProcessing(false);
    }
  }, [toast, user, playSound]);

  const updateTransaction = useCallback(async (id: string, data: z.infer<typeof TransactionFormSchema>) => {
    if (!user?.uid) throw new Error("User not authenticated");
    try {
      await updateStoredTransaction(user.uid, id, data);
    } catch (error) {
      console.error("Failed to update transaction:", error);
      toast({ variant: 'destructive', title: 'Erro ao Atualizar', description: "Não foi possível atualizar a transação." });
      throw error;
    }
  }, [toast, user]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!user?.uid) throw new Error("User not authenticated");
    try {
      await deleteStoredTransaction(user.uid, id);
    } catch (error) {
      console.error("Failed to delete transaction:", error);
      toast({ variant: 'destructive', title: 'Erro ao Excluir', description: "Não foi possível excluir a transação." });
      throw error;
    }
  }, [toast, user]);

  return (
    <TransactionsContext.Provider value={{ transactions, addTransaction, updateTransaction, deleteTransaction, isLoading, isBatchProcessing }}>
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionsContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionsProvider');
  }
  return context;
}

// 5. Lumina Unread Context
interface LuminaContextType {
  hasUnread: boolean;
  setHasUnread: React.Dispatch<React.SetStateAction<boolean>>;
}
const LuminaContext = createContext<LuminaContextType | undefined>(undefined);

function LuminaProvider({ children }: { children: React.ReactNode }) {
    const [hasUnread, setHasUnread] = useState(false);
    const { user } = useAuth();
    const pathname = usePathname();
    const { isSubscribed } = useSubscription();
    const { viewMode, coupleLink } = useCoupleStore();
    const isAdmin = user?.email === 'digitalacademyoficiall@gmail.com';

    useEffect(() => {
        if (pathname === '/dashboard/lumina') {
            setHasUnread(false);
            localStorage.setItem('lastLuminaVisit', new Date().toISOString());
        }
    }, [pathname]);

    useEffect(() => {
        if (!user || (!isSubscribed && !isAdmin)) return;
        
        let unsubscribe: () => void;
        const handleNewMessages = (newMessages: ChatMessage[]) => {
             const latestMessage = newMessages[newMessages.length - 1];
            if (!latestMessage) return;
            const lastVisit = new Date(localStorage.getItem('lastLuminaVisit') || 0);
            if (latestMessage.authorId !== user.uid && new Date(latestMessage.timestamp) > lastVisit && pathname !== '/dashboard/lumina') {
                setHasUnread(true);
            }
        };

        if (viewMode === 'together' && coupleLink) {
            unsubscribe = onCoupleChatUpdate(coupleLink.id, handleNewMessages);
        } else {
            unsubscribe = onChatUpdate(user.uid, handleNewMessages);
        }
        return () => unsubscribe();
    }, [user, isSubscribed, isAdmin, pathname, viewMode, coupleLink]);

    return (
        <LuminaContext.Provider value={{ hasUnread, setHasUnread }}>
            {children}
        </LuminaContext.Provider>
    );
}

export function useLumina() {
    const context = useContext(LuminaContext);
    if (context === undefined) {
        throw new Error('useLumina must be used within a LuminaProvider');
    }
    return context;
}

// Main ClientProviders Component
export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <SubscriptionProvider>
          <CoupleProvider>
            <TransactionsProvider>
              <LuminaProvider>
                  {children}
              </LuminaProvider>
            </TransactionsProvider>
          </CoupleProvider>
        </SubscriptionProvider>
    );
}
