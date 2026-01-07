
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Lightbulb, ListChecks, Activity, Loader2, RefreshCw, Sparkles, DollarSign, ArrowLeft, Star, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import type { GenerateFinancialAnalysisOutput } from '@/types';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useTransactions, useSubscription, useAuth } from '@/components/providers/client-providers';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { runAnalysis } from '../actions';

const PremiumBlocker = () => (
    <Card className="text-center">
        <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
                <Star className="h-6 w-6 text-amber-500" />
                Recurso Premium
            </CardTitle>
            <CardDescription>
                A Análise Financeira com a Lúmina é um recurso exclusivo para assinantes.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
                Faça o upgrade do seu plano para obter diagnósticos, dicas personalizadas e muito mais.
            </p>
            <Button asChild>
                <Link href="/dashboard/pricing">Ver Planos</Link>
            </Button>
        </CardContent>
    </Card>
);

const healthStatusConfig = {
    'Saudável': {
        icon: ShieldCheck,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
        title: "Saúde Financeira: Saudável"
    },
    'Atenção': {
        icon: ShieldAlert,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
        title: "Saúde Financeira: Requer Atenção"
    },
    'Crítico': {
        icon: ShieldX,
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        borderColor: 'border-destructive/20',
        title: "Saúde Financeira: Crítica"
    }
}


export default function AnalysisPage() {
  const { user } = useAuth();
  const { isSubscribed, isLoading: isSubscriptionLoading } = useSubscription();
  const { transactions: allTransactions, isLoading: isLoadingTransactions } = useTransactions();
  const [analysis, setAnalysis] = useState<GenerateFinancialAnalysisOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const router = useRouter();

  const isAdmin = user?.email === 'digitalacademyoficiall@gmail.com';

  const transactionsHash = useMemo(() => {
    return JSON.stringify(allTransactions.map(t => t.id).sort());
  }, [allTransactions]);

  const handleRunAnalysis = useCallback(async (force = false) => {
    if (!isSubscribed && !isAdmin) return; // Don't run if not subscribed (and not admin)
    setIsAnalyzing(true);
    
    if (!force) {
        const cachedAnalysis = localStorage.getItem('financialAnalysis');
        const cachedHash = localStorage.getItem('financialAnalysisHash');
        if (cachedAnalysis && cachedHash === transactionsHash) {
            setAnalysis(JSON.parse(cachedAnalysis));
            setIsAnalyzing(false);
            return;
        }
    }
    
    if (allTransactions.length > 0) {
        try {
            const result = await runAnalysis({ transactions: allTransactions });
            setAnalysis(result);
            localStorage.setItem('financialAnalysis', JSON.stringify(result));
            localStorage.setItem('financialAnalysisHash', transactionsHash);
        } catch(e) {
            console.error("Failed to run analysis", e);
            setAnalysis(null);
        }
    } else {
        const defaultState: GenerateFinancialAnalysisOutput = {
          healthStatus: "Atenção",
          diagnosis: "Ainda não há transações para analisar. Comece adicionando seus gastos e receitas para obter uma análise financeira.",
          suggestions: [],
          trendAnalysis: undefined,
        };
        setAnalysis(defaultState);
        localStorage.removeItem('financialAnalysis');
        localStorage.removeItem('financialAnalysisHash');
    }
    setIsAnalyzing(false);
  }, [allTransactions, transactionsHash, isSubscribed, isAdmin]);

  useEffect(() => {
    if (!isLoadingTransactions && !isSubscriptionLoading) {
      handleRunAnalysis();
    }
  }, [isLoadingTransactions, isSubscriptionLoading, handleRunAnalysis]);

  if (isLoadingTransactions || isSubscriptionLoading || (isAnalyzing && (isSubscribed || isAdmin))) {
    return (
        <div className="flex justify-center items-center h-full p-8">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Analisando suas finanças com a Lúmina...</span>
            </div>
        </div>
    );
  }

  if (!isSubscribed && !isAdmin) {
    return <PremiumBlocker />;
  }


  if (!analysis) {
     return (
        <div className="text-center text-muted-foreground p-8">
            <p>Não foi possível gerar a análise. Tente novamente.</p>
        </div>
    );
  }
  
  const statusConfig = healthStatusConfig[analysis.healthStatus] || healthStatusConfig['Atenção'];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Activity className="h-6 w-6" />
                Análise Financeira
              </h1>
              <p className="text-muted-foreground">
                Sua saúde financeira e dicas personalizadas pela nossa IA Lúmina.
              </p>
            </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => handleRunAnalysis(true)} disabled={isAnalyzing}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Rerrodar Análise
        </Button>
      </div>

      <Card className={cn("bg-gradient-to-br from-transparent", statusConfig.bgColor, statusConfig.borderColor)}>
        <CardHeader>
          <CardTitle className={cn("flex items-center gap-3", statusConfig.color)}>
            <StatusIcon className="h-8 w-8" />
            {statusConfig.title}
          </CardTitle>
          <CardDescription className={cn(statusConfig.color, "opacity-90")}>
            Um resumo da sua situação financeira no período.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-foreground/90 whitespace-pre-wrap">{analysis.diagnosis}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks />
            Plano de Ação Sugerido
          </CardTitle>
          <CardDescription>
            Dicas práticas e personalizadas da Lúmina para você economizar mais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analysis.suggestions && analysis.suggestions.length > 0 ? (
            <ul className="space-y-4">
              {analysis.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-4 p-4 rounded-md border bg-muted/50">
                    <span className="flex h-2 w-2 translate-y-2 rounded-full bg-primary" />
                    <p className="flex-1 text-sm text-foreground/80">{suggestion}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma sugestão específica no momento. Continue registrando suas transações!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    