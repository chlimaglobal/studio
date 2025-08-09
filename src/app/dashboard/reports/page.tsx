
'use client';

import { useState, useMemo } from 'react';
import type { TransactionCategory } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PieChart as PieChartIcon, ArrowLeft, Loader2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import CategoryPieChart from '@/components/category-pie-chart';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useTransactions } from '@/components/client-providers';
import { allInvestmentCategories } from '@/lib/types';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface CategorySpending {
  name: TransactionCategory;
  value: number;
}

const MonthlyReportCard = () => {
  const { transactions } = useTransactions();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const monthlyData = useMemo(() => {
    const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === currentMonth.getMonth() && tDate.getFullYear() === currentMonth.getFullYear() && !t.hideFromReports && !allInvestmentCategories.has(t.category);
    });

    const income = monthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const balance = income - expenses;
    
    const spendingMap = new Map<TransactionCategory, number>();
    monthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        spendingMap.set(t.category, (spendingMap.get(t.category) || 0) + t.amount);
      });
      
    const topSpending = Array.from(spendingMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 categories

    return { income, expenses, balance, topSpending };
  }, [transactions, currentMonth]);

  return (
     <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Relatório Mensal Detalhado
                    </CardTitle>
                    <CardDescription>
                        Analise o fluxo de caixa do mês selecionado.
                    </CardDescription>
                </div>
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
            </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3 bg-secondary/30">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        <p className="text-sm text-muted-foreground">Receitas</p>
                    </div>
                    <p className="font-semibold text-lg text-green-500">{formatCurrency(monthlyData.income)}</p>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 bg-secondary/30">
                     <div className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-red-500" />
                        <p className="text-sm text-muted-foreground">Despesas</p>
                    </div>
                    <p className="font-semibold text-lg text-red-500">{formatCurrency(monthlyData.expenses)}</p>
                </div>
                 <div className="flex items-center justify-between rounded-lg border p-3 bg-secondary/30">
                     <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        <p className="text-sm text-muted-foreground">Balanço</p>
                    </div>
                    <p className="font-semibold text-lg text-primary">{formatCurrency(monthlyData.balance)}</p>
                </div>
            </div>
            <div>
                 <p className="text-sm font-medium text-muted-foreground mb-2 text-center">Top 5 Categorias de Gastos</p>
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData.topSpending} layout="vertical" margin={{ left: 20 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} fontSize={12} />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--muted))' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                    <div className="rounded-lg border bg-background p-2 shadow-sm text-sm">
                                        <p className="font-medium">{`${payload[0].payload.name}: ${formatCurrency(payload[0].value as number)}`}</p>
                                    </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="hsl(var(--primary))" background={{ fill: 'hsl(var(--secondary))', radius: 4 }} />
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </CardContent>
    </Card>
  )
}

export default function ReportsPage() {
  const { transactions, isLoading } = useTransactions();
  const router = useRouter();

  const categorySpendingData = useMemo((): CategorySpending[] => {
    const spendingMap = new Map<TransactionCategory, number>();

    transactions
      .filter(t => t.type === 'expense' && !t.hideFromReports && !allInvestmentCategories.has(t.category))
      .forEach(t => {
        spendingMap.set(t.category, (spendingMap.get(t.category) || 0) + t.amount);
      });

    return Array.from(spendingMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);
  
  const totalExpenses = useMemo(() => {
    return categorySpendingData.reduce((acc, curr) => acc + curr.value, 0);
  }, [categorySpendingData]);


  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-full p-8">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Carregando relatórios...</span>
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
            <BarChart3 className="h-6 w-6" />
            Relatórios
          </h1>
          <p className="text-muted-foreground">
            Analise seus dados financeiros com gráficos interativos.
          </p>
        </div>
      </div>

      <MonthlyReportCard />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Despesas por Categoria (Geral)
          </CardTitle>
          <CardDescription>
            Veja como suas despesas estão distribuídas entre as categorias em todo o histórico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categorySpendingData.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="h-[350px]">
                <CategoryPieChart data={categorySpendingData} />
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-medium text-muted-foreground mb-2">Detalhes das Despesas</p>
                 <ScrollArea className="h-[320px] pr-4">
                    <ul className="space-y-2">
                        {categorySpendingData.map((item, index) => {
                            const percentage = totalExpenses > 0 ? (item.value / totalExpenses) * 100 : 0;
                            return (
                                <li key={item.name} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted/50">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `hsl(var(--chart-${(index % 5) + 1}))` }}></span>
                                        <span>{item.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">{formatCurrency(item.value)}</p>
                                        <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                 </ScrollArea>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Não há despesas registradas para gerar o relatório.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
