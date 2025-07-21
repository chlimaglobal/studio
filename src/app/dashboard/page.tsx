
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardHeader from '@/components/dashboard-header';
import { ChevronDown, ChevronLeft, ChevronRight, TrendingUp, BarChart2, Sparkles, DollarSign, Loader2 } from 'lucide-react';
import FinancialChart from '@/components/financial-chart';
import { subMonths, format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Transaction, TransactionCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { generateFinancialAnalysis } from '@/ai/flows/generate-financial-analysis';
import type { GenerateFinancialAnalysisOutput } from '@/ai/flows/generate-financial-analysis';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { useTransactions } from './layout';

interface SummaryData {
  recebidos: number;
  despesas: number;
  previsto: number;
}

const AiTipsCard = () => {
  const { transactions } = useTransactions();
  const [tips, setTips] = useState<GenerateFinancialAnalysisOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('');

  const getTips = useCallback(async () => {
    setIsLoading(true);
    const storedName = localStorage.getItem('userName') || 'Usuário';
    setUserName(storedName.split(' ')[0]); // Get first name

    if (transactions.length > 2) { // Only run if there's some data
        try {
            const result = await generateFinancialAnalysis({ transactions });
            setTips(result);
        } catch (error) {
            console.error("Failed to fetch AI tips:", error);
            setTips(null);
        }
    } else {
        setTips(null);
    }
    setIsLoading(false);
  }, [transactions]);

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
          Dicas Importantes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          {userName}, olha só onde você pode estar errando nos seus gastos deste mês:
        </p>
        {tips.suggestions.slice(0, 1).map((tip, index) => (
             <div key={index} className="p-3 rounded-lg bg-background/50">
                <p className='font-semibold'>{tip.split(':')[0]}:</p>
                <p className="text-muted-foreground text-xs">{tip.split(':')[1]}</p>
            </div>
        ))}
        <Link href="/dashboard/analysis" passHref>
          <Button variant="link" className="p-0 h-auto text-primary">Ver todas as dicas</Button>
        </Link>
      </CardContent>
    </Card>
  );
};


export default function DashboardPage() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const { transactions, isLoading } = useTransactions();

    const handlePrevMonth = () => {
        setCurrentMonth(subMonths(currentMonth, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(addMonths(currentMonth, 1));
    };
    
    const { summary, categorySpending } = useMemo(() => {
        const monthTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === currentMonth.getMonth() && tDate.getFullYear() === currentMonth.getFullYear();
        });

        const recebidos = monthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const despesas = monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
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

        return { 
            summary: { recebidos, despesas, previsto },
            categorySpending
        };
    }, [transactions, currentMonth]);
    
    const generateChartData = (transactions: Transaction[]) => {
        const dataMap = new Map<string, { aReceber: number; aPagar: number; resultado: number }>();
        const sevenMonthsAgo = subMonths(new Date(), 6);
        sevenMonthsAgo.setDate(1);

        for (let i = 6; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            const monthKey = format(date, 'MM/yy');
            dataMap.set(monthKey, { aReceber: 0, aPagar: 0, resultado: 0 });
        }

        transactions.forEach(t => {
            const tDate = new Date(t.date);
            if (tDate >= sevenMonthsAgo) {
                const monthKey = format(tDate, 'MM/yy');
                if(dataMap.has(monthKey)){
                    const currentData = dataMap.get(monthKey)!;
                    if(t.type === 'income') {
                        currentData.aReceber += t.amount;
                    } else {
                        currentData.aPagar += t.amount;
                    }
                    currentData.resultado = currentData.aReceber - currentData.aPagar;
                    dataMap.set(monthKey, currentData);
                }
            }
        });
        
        return Array.from(dataMap.entries()).map(([date, values]) => ({
            date,
            ...values,
        }));
    };
    
    const chartData = useMemo(() => generateChartData(transactions), [transactions]);
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full p-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Carregando seu dashboard...</span>
                </div>
            </div>
        );
    }


  return (
    <div className="space-y-6">
      <DashboardHeader />

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
      
      <div className="grid grid-cols-3 gap-3 text-center px-0">
        <Card className="bg-secondary p-2">
            <CardHeader className="p-1 flex-row items-center justify-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-[hsl(var(--chart-1))]"></div>
                <CardTitle className="text-xs font-normal text-muted-foreground">Recebidos</CardTitle>
            </CardHeader>
            <CardContent className="p-1">
                 <p className="font-bold text-[hsl(var(--chart-1))] break-words text-base md:text-lg">{formatCurrency(summary.recebidos)}</p>
            </CardContent>
        </Card>
         <Card className="bg-secondary p-2">
            <CardHeader className="p-1 flex-row items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[hsl(var(--chart-2))]"></div>
                <CardTitle className="text-xs font-normal text-muted-foreground">Despesas</CardTitle>
            </CardHeader>
            <CardContent className="p-1">
                 <p className="font-bold text-[hsl(var(--chart-2))] break-words text-base md:text-lg">{formatCurrency(summary.despesas)}</p>
            </CardContent>
        </Card>
         <Card className="bg-secondary p-2">
            <CardHeader className="p-1 flex-row items-center justify-center gap-2">
                 <BarChart2 className="h-4 w-4 text-primary" />
                <CardTitle className="text-xs font-normal text-muted-foreground">Previsto</CardTitle>
            </CardHeader>
            <CardContent className="p-1">
                 <p className="font-bold text-primary break-words text-base md:text-lg">{formatCurrency(summary.previsto)}</p>
            </CardContent>
        </Card>
      </div>

       <div className="px-0 space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Resultado mês a mês</h2>
          <div className="h-[250px] w-full">
              <FinancialChart data={chartData} />
          </div>
        </div>

        <div>
            <h2 className="text-lg font-semibold mb-2">Gastos por categoria</h2>
            <Card className="bg-secondary/50">
              <CardContent className="pt-6 space-y-4">
                {categorySpending.length > 0 ? categorySpending.slice(0, 3).map(item => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-medium">{formatCurrency(item.value)}</span>
                    </div>
                    <Progress value={(item.value / summary.despesas) * 100} className="h-2" />
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Sem despesas neste mês.</p>
                )}
              </CardContent>
            </Card>
        </div>
        
        <AiTipsCard />

      </div>

    </div>
  );
}
