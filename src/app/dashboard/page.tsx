
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import DashboardHeader from '@/components/dashboard-header';
import { ChevronDown, ChevronLeft, ChevronRight, TrendingUp, BarChart2, Sparkles, DollarSign, Loader2, AlertCircle, ShieldAlert, Home, AlertTriangle } from 'lucide-react';
import FinancialChart from '@/components/financial-chart';
import { subMonths, format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Transaction, TransactionCategory, Budget, UserStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { generateFinancialAnalysis } from '@/ai/flows/generate-financial-analysis';
import type { GenerateFinancialAnalysisOutput } from '@/ai/flows/generate-financial-analysis';
import Link from 'next/link';
import { formatCurrency, cn, calculateMovingAverageCostOfLiving } from '@/lib/utils';
import { useTransactions, useAuth } from '@/components/client-providers';
import { NotificationPermission } from '@/components/notification-permission';
import { Skeleton } from '@/components/ui/skeleton';
import { onBudgetsUpdate, getDoc, doc, updateUserStatus, addChatMessage } from '@/lib/storage';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { allInvestmentCategories } from '@/lib/types';
import { OnboardingGuide } from '@/components/OnboardingGuide';
import { FeatureAnnouncement } from '@/components/feature-announcement';
import UpcomingBills from '@/components/upcoming-bills';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { useCoupleStore } from '@/hooks/use-couple-store';
import { PendingInviteCard } from '@/components/couple/PendingInviteCard';
import { PartnerInfoCard } from '@/components/couple/PartnerInfoCard';


interface SummaryData {
  recebidos: number;
  despesas: number;
  previsto: number;
}

type BudgetItem = {
    name: string;
    spent: number;
    budget: number;
    progress: number;
};

const AiTipsCard = () => {
  const { transactions } = useTransactions();
  const [tips, setTips] = useState<GenerateFinancialAnalysisOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('');

  const transactionsHash = useMemo(() => {
    return JSON.stringify(transactions.map(t => t.id).sort());
  }, [transactions]);


  const getTips = useCallback(async () => {
    setIsLoading(true);
    const storedName = localStorage.getItem('userName') || 'Usuário';
    setUserName(storedName.split(' ')[0]);

    const cachedAnalysis = localStorage.getItem('financialAnalysis');
    const cachedHash = localStorage.getItem('financialAnalysisHash');

    if (cachedAnalysis && cachedHash === transactionsHash) {
        setTips(JSON.parse(cachedAnalysis));
        setIsLoading(false);
        return;
    }

    const operationalTransactions = transactions.filter(t => !allInvestmentCategories.has(t.category) && !t.hideFromReports);

    if (operationalTransactions.length > 2) {
        try {
            const result = await generateFinancialAnalysis({ transactions: operationalTransactions });
            setTips(result);
            localStorage.setItem('financialAnalysis', JSON.stringify(result));
            localStorage.setItem('financialAnalysisHash', transactionsHash);
        } catch (error) {
            console.error("Failed to fetch AI tips:", error);
            setTips(null);
        }
    } else {
        setTips(null);
        localStorage.removeItem('financialAnalysis');
        localStorage.removeItem('financialAnalysisHash');
    }
    setIsLoading(false);
  }, [transactions, transactionsHash]);


  useEffect(() => {
    getTips();
    
    // Add listener for username changes
    const updateUsername = () => {
       const storedName = localStorage.getItem('userName') || 'Usuário';
       setUserName(storedName.split(' ')[0]);
    }
    window.addEventListener('storage', updateUsername);

    return () => window.removeEventListener('storage', updateUsername);

  }, [getTips]);


  if (isLoading || !tips || tips.suggestions.length === 0) {
    return null; // Don't show card if loading, no tips, or error
  }

  return (
    <Card className="bg-secondary/50 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-primary" />
          Dicas da Lúmina
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          {userName}, veja um ponto de atenção nos seus gastos este mês:
        </p>
        {tips.suggestions.slice(0, 1).map((tip, index) => (
             <div key={index} className="p-3 rounded-lg bg-background/50">
                <p className='font-semibold'>{tip.split(':')[0]}:</p>
                <p className="text-muted-foreground text-xs">{tip.split(':')[1]}</p>
            </div>
        ))}
        <Link href="/dashboard/analysis" passHref>
          <Button variant="link" className="p-0 h-auto text-primary">Ver análise completa</Button>
        </Link>
      </CardContent>
    </Card>
  );
};

const BudgetCard = ({ budgetItems, isPrivacyMode }: { budgetItems: BudgetItem[], isPrivacyMode: boolean }) => {
    if (budgetItems.length === 0) {
        return (
            <div>
                <h2 className="text-lg font-semibold mb-2">Orçamentos do Mês</h2>
                <Card className="bg-secondary/50">
                    <CardContent className="pt-6 text-center text-muted-foreground">
                        <p>Você ainda não definiu nenhum orçamento para este mês.</p>
                        <Link href="/dashboard/budgets" passHref>
                            <Button variant="link" className="mt-2">Definir Orçamento</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold">Orçamentos do Mês</h2>
                <Link href="/dashboard/budgets" passHref>
                    <Button variant="ghost" size="sm">Ver todos</Button>
                </Link>
            </div>
            <Card className="bg-secondary/50">
                <CardContent className="pt-6 space-y-4">
                    {budgetItems.map(item => (
                        <div key={item.name} className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium">{item.name}</span>
                                <div className="text-muted-foreground">
                                    <span className={cn("font-semibold", item.progress > 100 ? 'text-destructive' : 'text-foreground')}>
                                        {isPrivacyMode ? 'R$ ••••••' : formatCurrency(item.spent)}
                                    </span>
                                    <span> / {isPrivacyMode ? 'R$ ••••••' : formatCurrency(item.budget)}</span>
                                </div>
                            </div>
                            <Progress value={item.progress} className="h-2" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
};

const BudgetAlertsCard = ({ budgetItems, isPrivacyMode }: { budgetItems: BudgetItem[], isPrivacyMode: boolean }) => {
    const alerts = budgetItems
        .map(item => {
            if (item.progress > 100) {
                return { ...item, type: 'exceeded' as const };
            }
            if (item.progress > 80) {
                return { ...item, type: 'approaching' as const };
            }
            return null;
        })
        .filter(Boolean);

    if (alerts.length === 0) {
        return null;
    }

    return (
        <div>
            <h2 className="text-lg font-semibold mb-2">Alertas de Orçamento</h2>
            <Card className="bg-secondary/50">
                <CardContent className="pt-6 space-y-3">
                    {alerts.map(alert => (
                         <Alert key={alert!.name} variant={alert!.type === 'exceeded' ? 'destructive' : 'default'} className={cn(alert!.type === 'approaching' && 'border-amber-500/50 text-amber-500')}>
                            <ShieldAlert className={cn("h-4 w-4", alert!.type === 'exceeded' ? 'text-destructive' : 'text-amber-500')} />
                            <AlertDescription className={cn('text-xs', alert!.type === 'exceeded' ? 'text-destructive' : 'text-amber-500/90')}>
                                {alert!.type === 'exceeded'
                                    ? `Você ultrapassou em ${isPrivacyMode ? 'R$ ••••••' : formatCurrency(alert!.spent - alert!.budget)} o orçamento de ${alert!.name}.`
                                    : `Você já usou ${alert!.progress.toFixed(0)}% do seu orçamento para ${alert!.name}.`
                                }
                            </AlertDescription>
                        </Alert>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
};


const DashboardLoadingSkeleton = () => (
    <div className="space-y-6">
        <DashboardHeader isPrivacyMode={false} onTogglePrivacyMode={() => {}} />
        <Skeleton className="h-24 w-full" />
        <div className="flex items-center justify-center gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-8" />
        </div>
        <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
        </div>
        <div className="space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-64 w-full" />
        </div>
        <div className="space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-32 w-full" />
        </div>
    </div>
);

interface ChartDataPoint {
    date: string;
    aReceber: number;
    aPagar: number;
    resultado: number;
}

const generateChartData = (transactions: Transaction[]): ChartDataPoint[] => {
    const operationalTransactions = transactions.filter(t => !allInvestmentCategories.has(t.category) && !t.hideFromReports);
    
    // 1. Create a map to hold data for the last 6 months
    const monthlyData: Map<string, { aReceber: number; aPagar: number }> = new Map();
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
        const date = subMonths(today, i);
        const monthKey = format(date, 'MM/yy', { locale: ptBR });
        monthlyData.set(monthKey, { aReceber: 0, aPagar: 0 });
    }

    // 2. Iterate through transactions and aggregate them into the correct month
    operationalTransactions.forEach(t => {
        try {
            const transactionDate = new Date(t.date);
            const monthKey = format(transactionDate, 'MM/yy', { locale: ptBR });

            if (monthlyData.has(monthKey)) {
                const currentMonthData = monthlyData.get(monthKey)!;
                if (t.type === 'income') {
                    currentMonthData.aReceber += t.amount;
                } else if (t.type === 'expense') {
                    currentMonthData.aPagar += t.amount;
                }
            }
        } catch (e) {
            // Ignore invalid transaction dates
            console.warn("Skipping transaction with invalid date:", t);
        }
    });

    // 3. Create the final chart data array, calculating the balance for each month
    const chartData: ChartDataPoint[] = [];
    monthlyData.forEach((data, monthKey) => {
        chartData.push({
            date: monthKey,
            aReceber: data.aReceber,
            aPagar: data.aPagar,
            resultado: data.aReceber - data.aPagar,
        });
    });

    return chartData;
};



export default function DashboardPage() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const { transactions, isLoading: isLoadingTransactions } = useTransactions();
    const { user } = useAuth();
    const { status: coupleStatus } = useCoupleStore();
    const [budgets, setBudgets] = useState<Budget>({});
    const [isLoadingBudgets, setIsLoadingBudgets] = useState(true);
    const [isPrivacyMode, setIsPrivacyMode] = useState(false);
    const [manualCostOfLiving, setManualCostOfLiving] = useState<number | null>(null);
    const [userStatus, setUserStatus] = useState<UserStatus>({});


    // Call the checkDashboardStatus function when the component mounts
    useEffect(() => {
        if (user) {
            const checkStatus = async () => {
                try {
                    const checkDashboardStatus = httpsCallable(functions, 'checkDashboardStatus');
                    await checkDashboardStatus();
                } catch (error) {
                    console.warn("Could not check dashboard status:", error);
                }
            };
            checkStatus();
        }
    }, [user]);

     useEffect(() => {
        if (user) {
            // This is incorrect, user status should be fetched for the specific user.
            // For now, let's assume it's for the logged-in user.
            const unsub = onUserStatusUpdate(user.uid, setUserStatus);
            return () => unsub();
        }
    }, [user]);
    
    useEffect(() => {
        // We need to read from localstorage in a useEffect to avoid SSR issues.
        const storedCostString = localStorage.getItem('manualCostOfLiving');
        if (storedCostString) {
            const parsedCost = parseFloat(storedCostString.replace(',', '.'));
            setManualCostOfLiving(isNaN(parsedCost) ? null : parsedCost);
        } else {
             // If not set in localStorage, check the user's document in Firestore
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);
                getDoc(userDocRef).then(docSnap => {
                    if (docSnap.exists()) {
                        const userData = docSnap.data();
                        if (userData.manualCostOfLiving) {
                            setManualCostOfLiving(userData.manualCostOfLiving);
                            // Also save it to localStorage for consistency
                            localStorage.setItem('manualCostOfLiving', String(userData.manualCostOfLiving));
                        }
                    }
                });
            }
        }
    }, [user]);

    useEffect(() => {
        const storedPrivacyMode = localStorage.getItem('privacyMode') === 'true';
        setIsPrivacyMode(storedPrivacyMode);
    }, []);

    const handleTogglePrivacyMode = () => {
        const newMode = !isPrivacyMode;
        setIsPrivacyMode(newMode);
        localStorage.setItem('privacyMode', String(newMode));
    };

    const handlePrevMonth = () => {
        setCurrentMonth(subMonths(currentMonth, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(addMonths(currentMonth, 1));
    };
    
    const monthId = format(currentMonth, 'yyyy-MM');

    useEffect(() => {
        if (user) {
            setIsLoadingBudgets(true);
            const unsubscribe = onBudgetsUpdate(user.uid, monthId, (newBudgets) => {
                setBudgets(newBudgets || {});
                setIsLoadingBudgets(false);
            });
            return () => unsubscribe();
        }
    }, [user, monthId]);


    const { summary, categorySpending, budgetItems, costOfLiving, chartData } = useMemo(() => {
        const chartData = generateChartData(transactions);
        const operationalTransactions = transactions.filter(t => !allInvestmentCategories.has(t.category) && !t.hideFromReports);
        
        const monthTransactions = operationalTransactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === currentMonth.getMonth() && tDate.getFullYear() === currentMonth.getFullYear();
        });

        const recebidos = monthTransactions
            .filter(t => t.type === 'income')
            .reduce((acc, t) => acc + t.amount, 0);

        const despesas = monthTransactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => acc + t.amount, 0);
            
        const previsto = recebidos - despesas;

        const spendingMap = new Map<TransactionCategory, number>();
        monthTransactions
          .filter(t => t.type === 'expense')
          .forEach(t => {
            spendingMap.set(t.category, (spendingMap.get(t.category) || 0) + t.amount);
          });
          
        const categorySpending = Array.from(spendingMap.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

        const budgetItems = Object.entries(budgets)
            .map(([category, budgetAmount]) => {
                if (!budgetAmount || budgetAmount === 0) return null;
                const spent = spendingMap.get(category as TransactionCategory) || 0;
                const progress = (spent / budgetAmount) * 100;
                return {
                    name: category,
                    spent,
                    budget: budgetAmount,
                    progress,
                };
            })
            .filter(Boolean) as BudgetItem[];
        
        const calculatedCost = calculateMovingAverageCostOfLiving(transactions);
        const costOfLiving = manualCostOfLiving !== null && manualCostOfLiving > 0 ? manualCostOfLiving : calculatedCost;


        return { 
            summary: { recebidos, despesas, previsto },
            categorySpending,
            budgetItems,
            costOfLiving,
            chartData,
        };
    }, [transactions, currentMonth, budgets, manualCostOfLiving]);

     useEffect(() => {
        if (isLoadingTransactions || !user) return;
        
        const currentMonthStr = format(new Date(), 'yyyy-MM');
        const userName = user.displayName?.split(' ')[0] || 'Usuário';

        const createAlertMessage = (titulo: string, mensagemPrincipal: string, mensagemSecundaria: string) => {
            // This now returns a simple string, to be rendered inside a standard bubble
            return `${titulo}\n\n${mensagemPrincipal}\n\n${mensagemSecundaria}`;
        }

        // Logic for negative balance alert
        const checkNegativeBalance = async () => {
            // Check based on the *previous* month's final balance
            const lastMonthData = chartData.length > 1 ? chartData[chartData.length - 2] : null;
            if (lastMonthData && lastMonthData.resultado < 0 && userStatus.ultimoMesChecado !== format(subMonths(new Date(), 1), 'MM/yy')) {
                
                const messageText = `${userName}, terminei sua análise mensal e identifiquei que você fechou o mês no negativo.\nQuer que eu te mostre:\n• quais despesas mais pesaram?\n• quais entradas ficaram abaixo da média?\n• e o que você pode ajustar para virar esse cenário no próximo mês?`;
                
                await addChatMessage(user.uid, {
                    role: 'lumina',
                    text: messageText,
                    authorName: "Lúmina"
                });
                await updateUserStatus(user.uid, { ultimoMesChecado: format(subMonths(new Date(), 1), 'MM/yy') });
            }
        };

        checkNegativeBalance();

    }, [chartData, user, userStatus, isLoadingTransactions, costOfLiving]);
    
    if (isLoadingTransactions || isLoadingBudgets) {
        return <DashboardLoadingSkeleton />;
    }


  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-5">
        <OnboardingGuide />
        <FeatureAnnouncement />
        <DashboardHeader isPrivacyMode={isPrivacyMode} onTogglePrivacyMode={handleTogglePrivacyMode} />

        <NotificationPermission />

        {coupleStatus === 'pending_received' && <PendingInviteCard />}
        {coupleStatus === 'pending_sent' && <PendingInviteCard />}
        {coupleStatus === 'linked' && <PartnerInfoCard />}
        
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-sm w-28 text-center bg-primary/20 text-primary py-1 px-3 rounded-md">
            {format(currentMonth, 'MMMM / yy', { locale: ptBR })}
          </span>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-secondary p-3">
                <CardHeader className="p-1 flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-chart-1"></div>
                        Receitas
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-1 text-center">
                    <p className="font-bold text-chart-1 text-base">{isPrivacyMode ? 'R$ ••••••' : formatCurrency(summary.recebidos)}</p>
                </CardContent>
            </Card>
            <Card className="bg-secondary p-3">
                <CardHeader className="p-1 flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-chart-2"></div>
                        Despesas
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-1 text-center">
                    <p className="font-bold text-chart-2 text-base">{isPrivacyMode ? 'R$ ••••••' : formatCurrency(summary.despesas)}</p>
                </CardContent>
            </Card>
            <Card className="bg-secondary p-3">
                <CardHeader className="p-1 flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <BarChart2 className="h-3 w-3 text-primary" />
                        Balanço
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-1 text-center">
                    <p className={cn("font-bold text-base", summary.previsto >= 0 ? "text-primary" : "text-destructive")}>
                      {isPrivacyMode ? 'R$ ••••••' : formatCurrency(summary.previsto)}
                    </p>
                </CardContent>
            </Card>
            <Card className="bg-secondary p-3">
                <CardHeader className="p-1 flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Home className="h-3 w-3 text-primary" />
                        Custo de Vida
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-1 text-center">
                     <p className="font-bold text-primary text-base">
                        {isPrivacyMode ? 'R$ ••••••' : formatCurrency(costOfLiving)}
                     </p>
                </CardContent>
            </Card>
        </div>

        <div className="space-y-4">
          
          <div>
            <h2 className="text-lg font-semibold mb-2">Resultado mês a mês</h2>
            <div className="h-[250px]">
                <FinancialChart data={chartData} isPrivacyMode={isPrivacyMode} costOfLiving={costOfLiving} />
            </div>
          </div>
          <AiTipsCard />
          
          <UpcomingBills />

          <BudgetAlertsCard budgetItems={budgetItems} isPrivacyMode={isPrivacyMode} />

          <BudgetCard budgetItems={budgetItems} isPrivacyMode={isPrivacyMode} />

          <div>
              <h2 className="text-lg font-semibold mb-2">Gastos por categoria</h2>
              <Card className="bg-secondary/50">
                <CardContent className="pt-6 space-y-4">
                  {categorySpending.length > 0 ? categorySpending.slice(0, 3).map(item => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.name}</span>
                        <span className="font-medium">{isPrivacyMode ? 'R$ ••••••' : formatCurrency(item.value)}</span>
                      </div>
                      <Progress value={(item.value / summary.despesas) * 100} className="h-2" />
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Sem despesas neste mês.</p>
                  )}
                </CardContent>
              </Card>
          </div>
          
        </div>
      </div>
    </div>
  );
}
