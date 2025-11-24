
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
  getPartnerData 
} from '@/lib/storage';
import { Toaster } from "@/components/ui/toaster";
import type { Transaction, TransactionFormSchema, ChatMessage, AppUser } from '@/lib/types';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

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

// 3. ViewMode Context
type ViewMode = 'separate' | 'together';
interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  partnerData: AppUser | null;
}
const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function useViewMode() {
    const context = useContext(ViewModeContext);
    if (!context) {
        throw new Error('useViewMode must be used within a ViewModeProvider');
    }
    return context;
}


// 4. Transactions Context
interface TransactionsContextType {
  transactions: Transaction[];
  addTransaction: (data: z.infer<typeof TransactionFormSchema>, userId?: string) => Promise<void>;
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

function ViewModeProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [partnerData, setPartnerData] = useState<AppUser | null>(null);
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

    const getPartnerId = useCallback(async (): Promise<string | null> => {
        try {
            const getPartnerIdFunction = httpsCallable(functions, 'getPartnerId');
            const result = await getPartnerIdFunction();
            // @ts-ignore
            return result.data.partnerId || null;
        } catch (error) {
            console.error("Error calling getPartnerId function:", error);
            return null;
        }
    }, []);

    useEffect(() => {
        async function fetchPartnerData() {
            if (user && viewMode === 'together') {
                const partnerId = await getPartnerId();
                if (partnerId) {
                    const data = await getPartnerData(partnerId);
                    setPartnerData(data);
                } else {
                    setPartnerData(null);
                }
            } else {
                setPartnerData(null);
            }
        }
        fetchPartnerData();
    }, [user, viewMode, getPartnerId]);


    return (
        <ViewModeContext.Provider value={{ viewMode, setViewMode, partnerData }}>
            {children}
        </ViewModeContext.Provider>
    );
}


function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { viewMode, partnerData } = useViewMode();

   const getPartnerId = useCallback(async (): Promise<string | null> => {
        try {
            const getPartnerIdFunction = httpsCallable(functions, 'getPartnerId');
            const result = await getPartnerIdFunction();
             // @ts-ignore
            return result.data.partnerId || null;
        } catch (error) {
            console.error("Error calling getPartnerId function:", error);
            return null;
        }
    }, []);

  useEffect(() => {
    if (user?.uid) {
        setIsLoading(true);

        const unsubUser = onTransactionsUpdate(user.uid, (userTransactions) => {
            if (viewMode === 'separate' || !partnerData) {
                setTransactions(userTransactions);
                setIsLoading(false);
            } else {
                 const unsubPartner = onTransactionsUpdate(partnerData.uid, (partnerTransactions) => {
                    setTransactions([...userTransactions, ...partnerTransactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    setIsLoading(false);
                });
                // This is a bit tricky, but onTransactionsUpdate should handle its own cleanup.
                // When viewMode changes, this whole effect re-runs, and old listeners should be cleaned up.
            }
        });

        return () => {
            unsubUser();
        };

    } else if (!user) {
      setTransactions([]);
      setIsLoading(false);
    }
  }, [user, viewMode, partnerData]);

  const playSound = useCallback((soundFile: string) => {
    if (!soundFile || soundFile === 'none' || typeof window === 'undefined') return;
    try {
      const audio = new Audio(`/${soundFile}`);
      audio.play().catch(e => console.error("Error playing sound:", e));
    } catch (e) {
      console.error("Failed to play audio:", e);
    }
  }, []);
  
  const addTransaction = useCallback(async (data: z.infer<typeof TransactionFormSchema>, userId?: string) => {
    const currentUserId = userId || user?.uid;
    if (!currentUserId) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado para adicionar uma transação.' });
      throw new Error("User not authenticated");
    }
    
    try {
        await addStoredTransaction(data, currentUserId);

        const messageType = data.type === 'income' ? 'Receita' : 'Despesa';
        toast({
            title: `${messageType} adicionada!`,
            description: `${data.description} - ${formatCurrency(data.amount)}`,
        });

        const soundToPlay = data.type === 'income'
          ? localStorage.getItem('incomeSound') || 'cash-register.mp3'
          : localStorage.getItem('expenseSound') || 'swoosh.mp3';
        playSound(soundToPlay);

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

function LuminaProvider({ children }: { children: React.ReactNode }) {
    const [hasUnread, setHasUnread] = useState(false);
    const { user } = useAuth();
    const pathname = usePathname();
    const { isSubscribed } = useSubscription();
    const isAdmin = user?.email === 'digitalacademyoficiall@gmail.com';
    let lastMessageTimestamp: Date | null = null; // Use a simple variable, not a ref

    useEffect(() => {
        if (pathname === '/dashboard/lumina') {
            setHasUnread(false);
            localStorage.setItem('lastLuminaVisit', new Date().toISOString());
        }
    }, [pathname]);

    useEffect(() => {
        if (user && (isSubscribed || isAdmin)) {
            const unsubscribe = onChatUpdate(
                user.uid, 
                (newMessages) => {
                    const latestMessage = newMessages[newMessages.length - 1];
                    if (!latestMessage) return;

                    const lastVisitString = localStorage.getItem('lastLuminaVisit');
                    const lastVisit = lastVisitString ? new Date(lastVisitString) : new Date(0);
                    
                    if (
                        latestMessage.role !== 'user' && 
                        latestMessage.timestamp > lastVisit && 
                        pathname !== '/dashboard/lumina'
                    ) {
                        setHasUnread(true);
                    }
                }
            );
            return () => unsubscribe();
        }
    }, [user, isSubscribed, isAdmin, pathname]);

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
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <SubscriptionProvider>
              <ViewModeProvider>
                <TransactionsProvider>
                  <LuminaProvider>
                      {children}
                      <Toaster />
                  </LuminaProvider>
                </TransactionsProvider>
              </ViewModeProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </ThemeProvider>
    )
}

    