
'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription, useTransactions, useAuth } from '@/components/client-providers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Loader2, Star, LineChart, TrendingUp, TrendingDown, Landmark } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { categoryData } from '@/lib/types';
import TransactionsTable from '@/components/transactions-table';
import Link from 'next/link';
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns';
import FinancialChart from '@/components/financial-chart';

const investmentApplicationCategories = new Set(categoryData["Investimentos e Reservas"].filter(c => ['Ações', 'Fundos Imobiliários', 'Renda Fixa', 'Aplicação'].includes(c)));
const investmentReturnCategories = new Set(categoryData["Investimentos e Reservas"].filter(c => ['Proventos', 'Juros', 'Rendimentos'].includes(c)));
const investmentWithdrawalCategories = new Set(categoryData["Investimentos e Reservas"].filter(c => ['Retirada'].includes(c)));
const allInvestmentCategories = new Set([...investmentApplicationCategories, ...investmentReturnCategories, ...investmentWithdrawalCategories]);


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

const generateInvestmentChartData = (transactions: any[]) => {
    const dataMap = new Map<string, { aReceber: number; aPagar: number; resultado: number }>();
    const sixMonthsAgo = subMonths(new Date(), 5);
    sixMonthsAgo.setDate(1);

    for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthKey = format(date, 'MM/yy');
        dataMap.set(monthKey, { aReceber: 0, aPagar: 0, resultado: 0 });
    }

    let cumulativePatrimony = 0;
    const sortedMonths = Array.from(dataMap.keys()).sort((a, b) => new Date(`01/${a}`).getTime() - new Date(`01/${b}`).getTime());

    sortedMonths.forEach(monthKey => {
        const [month, year] = monthKey.split('/');
        const startDate = startOfMonth(new Date(parseInt(`20${year}`), parseInt(month) - 1));
        const endDate = endOfMonth(startDate);

        const monthTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= startDate && tDate <= endDate && allInvestmentCategories.has(t.category);
        });

        const netMonthInvestment = monthTransactions
            .filter(t => investmentApplicationCategories.has(t.category))
            .reduce((acc: any, t: any) => acc + t.amount, 0)
            -
            monthTransactions
            .filter(t => investmentWithdrawalCategories.has(t.category))
            .reduce((acc: any, t: any) => acc + t.amount, 0);

        const monthReturns = monthTransactions
            .filter(t => investmentReturnCategories.has(t.category))
            .reduce((acc: any, t: any) => acc + t.amount, 0);

        cumulativePatrimony += netMonthInvestment + monthReturns;
        
        dataMap.set(monthKey, {
            aReceber: monthReturns, // 'A Receber' no gráfico pode ser os rendimentos do mês
            aPagar: netMonthInvestment < 0 ? Math.abs(netMonthInvestment) : 0, // 'A Pagar' pode ser retiradas líquidas
            resultado: cumulativePatrimony, // 'Resultado' é o patrimônio acumulado
        });
    });

    // Fill forward for months with no transactions
    let lastKnownPatrimony = 0;
    const finalData = sortedMonths.map(monthKey => {
        const data = dataMap.get(monthKey)!;
        if (data.aReceber === 0 && data.aPagar === 0 && data.resultado === 0) {
            data.resultado = lastKnownPatrimony;
        } else {
            lastKnownPatrimony = data.resultado;
        }
        return { date: monthKey, ...data };
    });

    return finalData;
};


export default function InvestmentsPage() {
    const router = useRouter();
    const { transactions, isLoading: isLoadingTransactions } = useTransactions();
    const { isSubscribed, isLoading: isLoadingSubscription } = useSubscription();
    const { user } = useAuth();
    const isAdmin = user?.email === 'digitalacademyoficiall@gmail.com';

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
                        <Link href="/dashboard/reports" passHref>
                            <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
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
                        <Link href="/dashboard/reports" passHref>
                            <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
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
                        <Link href="/dashboard/reports" passHref>
                             <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
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
                                Crescimento dos seus investimentos ao longo do tempo.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                                <FinancialChart data={chartData} isPrivacyMode={false} />
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
