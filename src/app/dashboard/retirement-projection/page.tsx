
'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTransactions } from '@/components/client-providers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Info } from 'lucide-react';
import TransactionsTable from '@/components/transactions-table';
import { investmentApplicationCategories, investmentWithdrawalCategories, Transaction } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';

export default function RetirementProjectionPage() {
    const router = useRouter();
    const { transactions, isLoading } = useTransactions();

    const investmentTransactions = useMemo(() => {
        return transactions.filter(t => 
            investmentApplicationCategories.has(t.category) || 
            investmentWithdrawalCategories.has(t.category)
        );
    }, [transactions]);
    
    // Placeholder data from the image
    const projectGoal = {
        label: "2025 a 2050",
        title: "Quanto precisa poupar até a aposentadoria.",
        realized: 0,
        target: 1506302,
        targetLabel: "Meta do projeto",
    };

    const yearGoal = {
        label: "2025",
        title: "Quanto precisa poupar neste ano.",
        realized: 0,
        target: 11102,
        targetLabel: "Meta do ano",
    };

    const monthGoal = {
        label: "Agosto",
        title: "Quanto precisa poupar neste mês.",
        realized: 0,
        target: 2220,
        targetLabel: "Meta do mês",
    };
    
    const goals = [projectGoal, yearGoal, monthGoal];


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full p-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Carregando...</span>
                </div>
            </div>
        );
    }

    const ProgressCard = ({ goal }: { goal: typeof goals[0] }) => {
        const progress = goal.target > 0 ? (goal.realized / goal.target) * 100 : 0;
        
        return (
            <Card>
                <CardHeader>
                    <Badge variant="secondary" className="w-fit bg-primary/10 text-primary border-primary/20">{goal.label}</Badge>
                    <CardTitle className="text-lg pt-2">{goal.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Progress value={progress} />
                    <div className="flex justify-between text-sm">
                        <div>
                            <p className="text-muted-foreground">{progress.toFixed(0)}% Realizado</p>
                            <p className="font-bold text-lg">{formatCurrency(goal.realized)}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-muted-foreground">{goal.targetLabel}</p>
                            <p className="font-bold text-lg">{formatCurrency(goal.target)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div>
                  <h1 className="text-2xl font-semibold">Meu Progresso</h1>
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    Metas do projeto de vida <Info className="h-4 w-4 cursor-pointer" />
                  </p>
                </div>
            </div>
            
             <p className="text-sm text-muted-foreground">
                Veja o progresso das suas metas de poupança e garanta seus objetivos.
            </p>

            <div className="space-y-4">
                {goals.map(goal => <ProgressCard key={goal.label} goal={goal} />)}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Aplicações e Resgates</CardTitle>
                </CardHeader>
                <CardContent>
                    <TransactionsTable transactions={investmentTransactions} showExtraDetails />
                </CardContent>
            </Card>
        </div>
    );
}
