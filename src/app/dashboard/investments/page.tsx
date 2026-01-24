
'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription, useTransactions, useAuth } from '@/components/providers/app-providers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Loader2, Star, LineChart, TrendingUp, TrendingDown, Landmark, Sparkles, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { allInvestmentCategories, investmentApplicationCategories, investmentReturnCategories, investmentWithdrawalCategories, Transaction } from '@/types';
import TransactionsTable from '@/components/transactions-table';
import Link from 'next/link';
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns';
import FinancialChart from '@/components/financial-chart';
import InvestmentProjectionCalculator from '@/components/investment-projection-calculator';

const PremiumBlocker = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2">
                    <Star className="h-6 w-6 text-amber-500" />
                    Recurso Premium
                </CardTitle>
                <CardDescription>
                    O controle de investimentos é um recurso exclusivo para assinantes.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                    Faça o upgrade do seu plano para acompanhar a evolução do seu patrimônio.
                </p>
                <Button asChild>
                    <Link href="/dashboard/pricing">Ver Planos</Link>
                </Button>
            </CardContent>
        </Card>
    </div>
);

const generateInvestmentChartData = (transactions: Transaction[]) => {
    const dataMap = new Map<string, { aReceber: number; aPagar: number; resultado: number }>();
    const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

    for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthKey = format(date, 'MM/yy');
        dataMap.set(monthKey, { aReceber: 0, aPagar: 0, resultado: 0 });
    }

    const sortedMonths = Array.from(dataMap.keys()).sort((a, b) => {
        const [m1, y1] = a.split('/');
        const [m2, y2] = b.split('/');
        return new Date(parseInt(`20${y1}`), parseInt(m1) - 1).getTime() - new Date(parseInt(`20${y2}`), parseInt(m2) - 1).getTime();
    });

    const investmentTransactionsBeforeWindow = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate < sixMonthsAgo && allInvestmentCategories.has(t.category);
    });

    let cumulativePatrimony = investmentTransactionsBeforeWindow.reduce((acc, t) => {
        if (investmentApplicationCategories.has(t.category)) return acc + t.amount;
        if (investmentReturnCategories.has(t.category)) return acc + t.amount;
        if (investmentWithdrawalCategories.has(t.category)) return acc - t.amount;
        return acc;
    }, 0);


    sortedMonths.forEach(monthKey => {
        const [month, year] = monthKey.split('/');
        const startDate = startOfMonth(new Date(parseInt(`20${year}`), parseInt(month) - 1));
        const endDate = endOfMonth(startDate);

        const monthTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= startDate && tDate <= endDate && allInvestmentCategories.has(t.category);
        });

        const monthContributions = monthTransactions
            .filter(t => investmentApplicationCategories.has(t.category))
            .reduce((acc: any, t: any) => acc + t.amount, 0);

        const monthWithdrawals = monthTransactions
            .filter(t => investmentWithdrawalCategories.has(t.category))
            .reduce((acc: any, t: any) => acc + t.amount, 0);

        const monthReturns = monthTransactions
            .filter(t => investmentReturnCategories.has(t.category))
            .reduce((acc: any, t: any) => acc + t.amount, 0);
        
        cumulativePatrimony += monthContributions + monthReturns - monthWithdrawals;
        
        dataMap.set(monthKey, {
            aReceber: monthReturns,
            aPagar: monthContributions,
            resultado: cumulativePatrimony,
        });
    });

    return sortedMonths.map(monthKey => {
        const data = dataMap.get(monthKey)!;
        return { date: monthKey, ...data };
    });
};


export default function InvestmentsPage() {
    const router = useRouter();
    const { transactions, isLoading: isLoadingTransactions } = useTransactions();
    const { isSubscribed, isLoading: isLoadingSubscription } = useSubscription();
    const { user } = useAuth();
    const isAdmin = user?.email === 'digitalacademyoficial@gmail.com';

    const investmentData = useMemo(() => {
        const investmentTransactions = transactions.filter(t => allInvestmentCategories.has(t.category));
        
        const totalInvested = investmentTransactions
            .filter(t => investmentApplicationCategories.has(t.category))
            .reduce((acc, t) => acc + t.amount, 0);

        const totalWithdrawn = investmentTransactions
            .filter(t => investmentWithdrawalCategories.has(t.category))
            .reduce((acc, t) => acc + t.amount, 0);
            
        const totalReturns = investmentTransactions
            .filter(t => investmentReturnCategories.has(t.category))
            .reduce((acc, t) => acc + t.amount, 0);

        const netInvested = totalInvested - totalWithdrawn;
        const currentPatrimony = netInvested + totalReturns;

        return {
            investmentTransactions,
            netInvested,
            totalReturns,
            currentPatrimony
        };
    }, [transactions]);

    const chartData = useMemo(() => generateInvestmentChartData(transactions), [transactions]);
    
    if (isLoadingTransactions || isLoadingSubscription) {
        return (
            <div className="flex justify-center items-center h-full p-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Carregando seus investimentos...</span>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="flex w-full items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div className="flex-1 text-center">
                     <h1 className="text-2xl font-semibold flex items-center justify-center gap-2">
                        <LineChart className="h-6 w-6" />
                        Meus Investimentos
                    </h1>
                </div>
                <div className="w-10"></div> {/* Spacer to balance the back button */}
            </div>

             <div className="text-center">
                 <p className="text-muted-foreground">Acompanhe a evolução do seu patrimônio.</p>
             </div>

             { (isSubscribed || isAdmin) && (
                <div className="text-center">
                    <Button onClick={() => router.push('/dashboard/add-transaction?type=expense&category=Ações')}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Investimento
                    </Button>
                </div>
            )}


            {(!isSubscribed && !isAdmin) ? <PremiumBlocker /> : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link href="/dashboard/investments/aportes" passHref>
                            <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
                                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatCurrency(investmentData.netInvested)}</div>
                                    <p className="text-xs text-muted-foreground">Valor líquido aplicado.</p>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href="/dashboard/investments/rendimentos" passHref>
                            <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Rendimentos</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-500">{formatCurrency(investmentData.totalReturns)}</div>
                                    <p className="text-xs text-muted-foreground">Lucro total com dividendos, juros, etc.</p>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href="/dashboard/investments/patrimonio" passHref>
                            <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Patrimônio Atual</CardTitle>
                                    <Landmark className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-primary">{formatCurrency(investmentData.currentPatrimony)}</div>
                                    <p className="text-xs text-muted-foreground">Soma do investido com rendimentos.</p>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Evolução do Patrimônio</CardTitle>
                            <CardDescription>
                                No gráfico: "Receitas" são seus rendimentos mensais, "Despesas" são seus aportes mensais, e "Balanço" é o seu patrimônio total acumulado.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                                <FinancialChart data={chartData} isPrivacyMode={false} costOfLiving={0}/>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                Análise de Perfil de Investidor
                            </CardTitle>
                            <CardDescription>
                                Entenda seu perfil de risco e receba sugestões de investimentos alinhadas aos seus objetivos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full" asChild>
                                <Link href="/dashboard/investments/analise-perfil-investidor">Analisar meu perfil com a Lúmina</Link>
                            </Button>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calculator className="h-5 w-5 text-primary" />
                                Simulador de Investimentos
                            </CardTitle>
                            <CardDescription>
                                Projete o crescimento do seu dinheiro com base no rendimento progressivo do CDI.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <InvestmentProjectionCalculator />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Movimentações</CardTitle>
                            <CardDescription>
                                Todas as suas transações de investimento, incluindo aportes e rendimentos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TransactionsTable transactions={investmentData.investmentTransactions} showExtraDetails />
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
