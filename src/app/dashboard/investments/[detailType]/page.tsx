
'use client';

import { useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTransactions } from '@/components/client-providers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, Landmark } from 'lucide-react';
import TransactionsTable from '@/components/transactions-table';
import { allInvestmentCategories, investmentApplicationCategories, investmentReturnCategories, investmentWithdrawalCategories, Transaction } from '@/types';


const detailTypeConfig = {
    aportes: {
        title: 'Aportes e Retiradas',
        description: 'Detalhes de todos os valores que você investiu ou retirou.',
        icon: TrendingDown,
        filter: (t: Transaction) => investmentApplicationCategories.has(t.category) || investmentWithdrawalCategories.has(t.category),
    },
    rendimentos: {
        title: 'Rendimentos',
        description: 'Histórico de todos os lucros recebidos, como dividendos e juros.',
        icon: TrendingUp,
        filter: (t: Transaction) => investmentReturnCategories.has(t.category),
    },
    patrimonio: {
        title: 'Patrimônio Total',
        description: 'Todas as movimentações que compõem seu patrimônio investido.',
        icon: Landmark,
        filter: (t: Transaction) => allInvestmentCategories.has(t.category),
    },
};


export default function InvestmentDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { transactions, isLoading } = useTransactions();
    
    const detailType = params.detailType as keyof typeof detailTypeConfig;
    const config = detailTypeConfig[detailType] || detailTypeConfig.patrimonio;
    
    const filteredTransactions = useMemo(() => {
        return transactions.filter(config.filter);
    }, [transactions, config.filter]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full p-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Carregando detalhes...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div>
                  <h1 className="text-2xl font-semibold flex items-center gap-2">
                    <config.icon className="h-6 w-6" />
                    {config.title}
                  </h1>
                  <p className="text-muted-foreground">
                    {config.description}
                  </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Movimentações</CardTitle>
                </CardHeader>
                <CardContent>
                    <TransactionsTable transactions={filteredTransactions} showExtraDetails />
                </CardContent>
            </Card>
        </div>
    );
}
