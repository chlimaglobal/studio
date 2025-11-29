
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Sparkles, PiggyBank, DollarSign, TrendingUp, HandCoins } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useTransactions, useAuth, useSubscription } from '@/components/client-providers';
import { calculateSavingsGoal, type SavingsGoalOutput } from '@/ai/flows/calculate-savings-goal';
import { formatCurrency } from '@/lib/utils';
import { allInvestmentCategories } from '@/lib/types';
import Link from 'next/link';

const PremiumBlocker = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2">
                    <Sparkles className="h-6 w-6 text-amber-500" />
                    Análise Premium da Lúmina
                </CardTitle>
                <CardDescription>
                    O cálculo de metas de economia é um recurso exclusivo para assinantes.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                    Faça o upgrade para que a Lúmina analise suas finanças e defina uma meta realista para você.
                </p>
                <Button asChild>
                    <Link href="/dashboard/pricing">Ver Planos</Link>
                </Button>
            </CardContent>
        </Card>
    </div>
);

const ResultDisplay = ({ result, onReset }: { result: SavingsGoalOutput, onReset: () => void }) => {
    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
            <Card className="text-center bg-primary/10 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex flex-col items-center gap-2 text-primary">
                        <PiggyBank className="h-10 w-10" />
                        <span>Sua Meta de Economia Mensal</span>
                    </CardTitle>
                    <p className="text-4xl font-bold pt-2">{formatCurrency(result.recommendedGoal)}</p>
                    <CardDescription>
                        Isto representa <strong>{result.recommendedPercentage.toFixed(1)}%</strong> da sua renda.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Análise da Lúmina</CardTitle>
                    <CardDescription>Entenda como chegamos a este número.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-3 border rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            <p>Renda Mensal (últimos 30 dias)</p>
                        </div>
                        <p className="font-semibold text-green-500">{formatCurrency(result.monthlyIncome)}</p>
                    </div>
                     <div className="flex justify-between items-center p-3 border rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-3">
                            <DollarSign className="h-5 w-5 text-red-500" />
                            <p>Gastos Atuais (últimos 30 dias)</p>
                        </div>
                        <p className="font-semibold text-red-500">{formatCurrency(result.currentExpenses)}</p>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-3">
                            <HandCoins className="h-5 w-5 text-primary" />
                            <p>Capacidade Real de Economia</p>
                        </div>
                        <p className="font-semibold text-primary">{formatCurrency(result.savingCapacity)}</p>
                    </div>
                </CardContent>
            </Card>
             <Button onClick={onReset} variant="outline" className="w-full">Recalcular Meta</Button>
        </div>
    )
};


export default function SavingsGoalPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const { isSubscribed, isLoading: isSubscriptionLoading } = useSubscription();
    const { transactions, isLoading: isLoadingTransactions } = useTransactions();
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<SavingsGoalOutput | null>(null);

    const isAdmin = user?.email === 'digitalacademyoficiall@gmail.com';

    const handleAnalysis = async () => {
        setIsLoading(true);

        const operationalTransactions = transactions.filter(
            t => !allInvestmentCategories.has(t.category) && !t.hideFromReports
        );

        if (operationalTransactions.length < 5) {
             toast({
                variant: "destructive",
                title: "Dados Insuficientes",
                description: "Você precisa de mais transações para uma análise precisa. Continue registrando seus gastos e receitas!"
            });
            setIsLoading(false);
            return;
        }

        try {
            const result = await calculateSavingsGoal({ transactions: operationalTransactions });
            setAnalysisResult(result);
        } catch (error) {
            console.error("Savings goal calculation failed:", error);
            toast({
                variant: "destructive",
                title: "Erro na Análise",
                description: "Não foi possível calcular sua meta. Tente novamente."
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isSubscriptionLoading || isLoadingTransactions) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
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
                    <h1 className="text-2xl font-semibold">Meta de Economia Mensal</h1>
                    <p className="text-muted-foreground">Descubra quanto você pode economizar por mês.</p>
                </div>
            </div>

            {(!isSubscribed && !isAdmin) ? <PremiumBlocker /> : (
                analysisResult ? (
                    <ResultDisplay result={analysisResult} onReset={() => setAnalysisResult(null)} />
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>Análise Inteligente da Lúmina</CardTitle>
                            <CardDescription>
                                Deixe que nossa IA analise seus últimos 30 dias de transações para definir uma meta de economia mensal que seja realista e desafiadora na medida certa para você.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={handleAnalysis} disabled={isLoading} className="w-full">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Pedir análise da Lúmina
                            </Button>
                        </CardContent>
                    </Card>
                )
            )}
        </div>
    );
}
