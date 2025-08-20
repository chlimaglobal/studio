
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
  onChatUpdate,
  getPartnerData 
} from '@/lib/storage';
import { Toaster } from "@/components/ui/toaster";
import type { Transaction, TransactionFormSchema, ChatMessage } from '@/lib/types';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { sendWhatsAppNotification, getPartnerId } from '@/app/actions';
import { usePathname } from 'next/navigation';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

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
  partnerData: User | null;
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

// 5. Mural Unread Context
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

function ViewModeProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [partnerData, setPartnerData] = useState<User | null>(null);
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

    useEffect(() => {
        async function fetchPartnerData() {
            if (user && viewMode === 'together') {
                const partnerId = await getPartnerId(user.uid);
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
    }, [user, viewMode]);


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
  const { viewMode } = useViewMode();

  useEffect(() => {
    if (user?.uid) {
        setIsLoading(true);

        const unsubUser = onTransactionsUpdate(user.uid, (userTransactions) => {
            if (viewMode === 'separate') {
                setTransactions(userTransactions);
                setIsLoading(false);
            } else {
                 getPartnerId(user.uid).then(partnerId => {
                    if (partnerId) {
                        const unsubPartner = onTransactionsUpdate(partnerId, (partnerTransactions) => {
                            setTransactions([...userTransactions, ...partnerTransactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                            setIsLoading(false);
                        });
                        // This cleanup is tricky, but onTransactionsUpdate handles it.
                    } else {
                        setTransactions(userTransactions);
                        setIsLoading(false);
                    }
                });
            }
        });

        return () => {
            unsubUser();
        };

    } else if (!user) {
      setTransactions([]);
      setIsLoading(false);
    }
  }, [user, viewMode]);

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
    const lastMessageTimestampRef = React.useRef<Date | null>(null);

    useEffect(() => {
        if (pathname === '/dashboard/mural') {
            setHasUnread(false);
            localStorage.setItem('lastMuralVisit', new Date().toISOString());
        }
    }, [pathname]);

    useEffect(() => {
        if (user && (isSubscribed || isAdmin)) {
            // This listener only gets new messages
            const unsubscribe = onChatUpdate(
                user.uid, 
                (newMessages) => {
                    const latestMessage = newMessages[newMessages.length - 1];
                    if (!latestMessage) return;

                    const lastVisitString = localStorage.getItem('lastMuralVisit');
                    const lastVisit = lastVisitString ? new Date(lastVisitString) : new Date(0);
                    
                    if (
                        latestMessage.role !== 'user' && 
                        latestMessage.timestamp > lastVisit && 
                        pathname !== '/dashboard/mural'
                    ) {
                        setHasUnread(true);
                    }
                    
                    // Update the ref to the very last message timestamp
                    lastMessageTimestampRef.current = latestMessage.timestamp;
                }, 
                // We use a ref to the timestamp to avoid re-subscribing on every new message
                lastMessageTimestampRef.current ? { 
                    id: '', // Dummy id
                    timestamp: lastMessageTimestampRef.current 
                } : null
            );
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
                <ViewModeProvider>
                    <TransactionsProvider>
                        <MuralProvider>
                            {children}
                            <Toaster />
                        </MuralProvider>
                    </TransactionsProvider>
                </ViewModeProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </ThemeProvider>
    )
}
