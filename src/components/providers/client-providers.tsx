
'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app, functions } from '@/lib/firebase';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  addStoredTransaction, 
  deleteStoredTransaction, 
  initializeUser, 
  onTransactionsUpdate, 
  onUserSubscriptionUpdate, 
  updateStoredTransaction,
  onChatUpdate, 
  getPartnerData,
  onCoupleChatUpdate,
  addCoupleChatMessage,
  onUserUpdate,
  updateTransactionCategory
} from '@/lib/storage';
import { getCategorySuggestion } from '@/app/dashboard/actions';
import { Toaster } from "@/components/ui/toaster";
import type { Transaction, TransactionFormSchema, ChatMessage, AppUser, Couple, TransactionCategory } from '@/types';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useCoupleStore, initializeCoupleStore } from '@/hooks/use-couple-store';

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

// 3. Couple Context (formerly ViewMode)
type ViewMode = 'separate' | 'together';
interface CoupleContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  partnerData: AppUser | null;
}
const CoupleContext = createContext<CoupleContextType | undefined>(undefined);

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

export function useLumina() {
    const context = useContext(LuminaContext);
    if (context === undefined) {
        throw new Error('useLumina must be used within a ClientProviders');
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
        initializeCoupleStore(user); // Initialize couple store ONLY after auth is confirmed
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


function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { viewMode, partnerData } = useViewMode();
  const { coupleLink } = useCoupleStore();

  // This effect now handles fetching transactions for one or both users
  useEffect(() => {
    if (!user?.uid) {
      setTransactions([]);
      setIsLoading(false);
      return () => {}; // Return empty cleanup function
    }

    setIsLoading(true);
    let userTransactions: Transaction[] = [];
    let partnerTransactions: Transaction[] = [];

    // Always subscribe to the logged-in user's transactions
    const unsubUser = onTransactionsUpdate(user.uid, (newTxs) => {
      userTransactions = newTxs;
      // If in separate mode, or no partner, just show user's transactions
      if (viewMode === 'separate' || !partnerData?.uid) {
        setTransactions(userTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setIsLoading(false);
      } else {
        // In 'together' mode, combine with partner's (if available)
        setTransactions([...userTransactions, ...partnerTransactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setIsLoading(false);
      }
    });

    let unsubPartner: (() => void) | null = null;
    // If in 'together' mode and a partner exists, also subscribe to their transactions
    if (viewMode === 'together' && partnerData?.uid) {
      unsubPartner = onTransactionsUpdate(partnerData.uid, (newTxs) => {
        partnerTransactions = newTxs;
        // Combine with user's transactions
        setTransactions([...userTransactions, ...partnerTransactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setIsLoading(false);
      });
    } else {
        // If not in 'together' mode, clear partner transactions
        partnerTransactions = [];
        if(viewMode === 'separate') {
            setTransactions(userTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }
    }

    // Cleanup function
    return () => {
      unsubUser();
      if (unsubPartner) {
        unsubPartner();
      }
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
        const newTransactionsInfo = await addStoredTransaction(transactionsToAdd, user.uid);

        if (!isBatch) {
            const trx = transactionsToAdd[0];
            const messageType = trx.type === 'income' ? 'Receita' : 'Despesa';
            toast({
                title: `${messageType} adicionada!`,
                description: `${trx.description} - ${formatCurrency(trx.amount)}`,
            });
            const soundToPlay = trx.type === 'income'
              ? localStorage.getItem('incomeSound') || 'cash-register.mp3'
              : localStorage.getItem('expenseSound') || 'swoosh.mp3';
            playSound(soundToPlay);
        } else {
             toast({
                title: `Transações em lote salvas!`,
                description: `${transactionsToAdd.length} novas transações foram adicionadas com sucesso.`,
            });
             playSound(localStorage.getItem('incomeSound') || 'cash-register.mp3');
        }

        // Fire-and-forget AI enhancement
        newTransactionsInfo.forEach(txInfo => {
            if (!txInfo.category || txInfo.category === 'Outros') {
                (async () => {
                    try {
                        const suggestion = await getCategorySuggestion({ description: txInfo.description });
                        if (suggestion.category && suggestion.category !== 'Outros') {
                            await updateTransactionCategory(user.uid, txInfo.id, suggestion.category);
                        }
                    } catch (e) {
                        // Fail silently as per user's requirement
                        console.warn('Post-transaction AI categorization failed:', e);
                    }
                })();
            }
        });


    } catch (error) {
        console.error("Failed to save transaction(s):", error);
        toast({
            variant: 'destructive',
            title: 'Erro ao Salvar Transação',
            description: "Não foi possível salvar as transações no banco de dados. Tente novamente.",
        });
        throw error;
    } finally {
        if (isBatch) setIsBatchProcessing(false);
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
    <TransactionsContext.Provider value={{ transactions, addTransaction, updateTransaction, deleteTransaction, isLoading, isBatchProcessing }}>
      {children}
    </TransactionsContext.Provider>
  );
}

function LuminaProvider({ children }: { children: React.ReactNode }) {
    const [hasUnread, setHasUnread] = useState(false);
    const { user } = useAuth();
    const pathname = usePathname();
    const { isSubscribed } = useSubscription();
    const { viewMode, coupleLink } = useCoupleStore();
    const isAdmin = user?.email === 'digitalacademyoficiall@gmail.com';
    let lastMessageTimestamp: Date | null = null; // Use a simple variable, not a ref

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

            const lastVisitString = localStorage.getItem('lastLuminaVisit');
            const lastVisit = lastVisitString ? new Date(lastVisitString) : new Date(0);
            
            if (
                latestMessage.authorId !== user.uid && 
                new Date(latestMessage.timestamp) > lastVisit && 
                pathname !== '/dashboard/lumina'
            ) {
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

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider 
          attribute="class"
          defaultTheme="system"
          storageKey="vite-ui-theme"
          disableTransitionOnChange
        >
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
    )
}

export { useCoupleStore };
