
'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription, useTransactions } from '@/components/client-providers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Loader2, Star, LineChart, TrendingUp, TrendingDown, Landmark } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { categoryData } from '@/lib/types';
import TransactionsTable from '@/components/transactions-table';
import Link from 'next/link';

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

export default function InvestmentsPage() {
    const router = useRouter();
    const { transactions, isLoading: isLoadingTransactions } = useTransactions();
    const { isSubscribed, isLoading: isLoadingSubscription } = useSubscription();

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

    if (!isSubscribed) {
        return (
            <div className="flex flex-col h-full space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-semibold flex items-center gap-2">
                                <LineChart className="h-6 w-6" />
                                Meus Investimentos
                            </h1>
                            <p className="text-muted-foreground">Acompanhe a evolução do seu patrimônio.</p>
                        </div>
                    </div>
                </div>
                <PremiumBlocker />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-semibold flex items-center gap-2">
                            <LineChart className="h-6 w-6" />
                            Meus Investimentos
                        </h1>
                        <p className="text-muted-foreground">Acompanhe a evolução do seu patrimônio.</p>
                    </div>
                </div>
                <Button onClick={() => router.push('/dashboard/add-transaction?type=expense&category=Ações')}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Investimento
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(investmentData.netInvested)}</div>
                        <p className="text-xs text-muted-foreground">Valor líquido aplicado.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rendimentos</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">{formatCurrency(investmentData.totalReturns)}</div>
                        <p className="text-xs text-muted-foreground">Lucro total com dividendos, juros, etc.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Patrimônio Atual</CardTitle>
                        <Landmark className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">{formatCurrency(investmentData.currentPatrimony)}</div>
                        <p className="text-xs text-muted-foreground">Soma do investido com rendimentos.</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Movimentações</CardTitle>
                    <CardDescription>
                        Todas as suas transações de investimento, incluindo aportes e rendimentos.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TransactionsTable transactions={investmentData.investmentTransactions} />
                </CardContent>
            </Card>

        </div>
    )
}
