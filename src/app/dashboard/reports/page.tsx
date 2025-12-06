
'use client';

import { useState, useMemo, useEffect } from 'react';
import type { TransactionCategory, Transaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PieChart as PieChartIcon, ArrowLeft, Loader2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign, Sparkles, ArrowUp, ArrowDown, Download } from 'lucide-react';
import CategoryPieChart from '@/components/category-pie-chart';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useTransactions } from '@/components/client-providers';
import { allInvestmentCategories } from '@/lib/types';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { generateFinancialAnalysis } from '@/ai/flows/generate-financial-analysis';
import type { GenerateFinancialAnalysisOutput } from '@/ai/flows/generate-financial-analysis';
import Papa from 'papaparse';


interface CategorySpending {
  name: TransactionCategory;
  value: number;
}

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      aria-hidden="true"
      focusable="false"
      data-prefix="fab"
      data-icon="whatsapp"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 448 512"
      {...props}
    >
      <path
        fill="currentColor"
        d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.8 0-65.7-10.8-94-31.5l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.8-16.4-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"
      ></path>
    </svg>
);


const TrendAnalysisCard = () => {
    const { transactions, isLoading: isLoadingTransactions } = useTransactions();
    const [analysis, setAnalysis] = useState<GenerateFinancialAnalysisOutput['trendAnalysis']>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const runAnalysis = async () => {
            setIsLoading(true);
             const operationalTransactions = transactions.filter(t => !t.hideFromReports && !allInvestmentCategories.has(t.category));
             if (operationalTransactions.length > 3) { // Need some data to analyze trends
                const result = await generateFinancialAnalysis({ transactions: operationalTransactions });
                setAnalysis(result.trendAnalysis);
            } else {
                setAnalysis(null);
            }
            setIsLoading(false);
        };
        if (!isLoadingTransactions) {
            runAnalysis();
        }
    }, [transactions, isLoadingTransactions]);

    if (isLoading || isLoadingTransactions) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                         <Sparkles className="h-5 w-5 text-primary" />
                        Análise de Tendências da Lúmina
                    </CardTitle>
                </CardHeader>
                 <CardContent className="flex items-center justify-center h-24">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </CardContent>
            </Card>
        )
    }

    if (!analysis) {
        return null; // Don't show if no analysis is available
    }

    return (
        <Card className="bg-gradient-to-br from-primary/5 to-background">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Análise de Tendências
                </CardTitle>
                <CardDescription>
                    {analysis.trendDescription}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                 <p className="text-sm font-medium text-muted-foreground">Categorias com maiores variações:</p>
                 <div className="space-y-3">
                    {analysis.topChangingCategories?.map(item => (
                        <div key={item.category} className="flex justify-between items-center text-sm p-3 rounded-md bg-background/50 border">
                            <span className="font-semibold">{item.category}</span>
                             <div className="text-right">
                                <div className={cn("flex items-center justify-end font-bold gap-1", item.changePercentage > 0 ? "text-destructive" : "text-green-500")}>
                                    {item.changePercentage > 0 ? <ArrowUp className="h-4 w-4"/> : <ArrowDown className="h-4 w-4"/>}
                                    {item.changePercentage.toFixed(0)}%
                                </div>
                                <span className="text-xs text-muted-foreground">Gasto atual: {formatCurrency(item.currentMonthSpending)}</span>
                            </div>
                        </div>
                    ))}
                 </div>
            </CardContent>
        </Card>
    );
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

    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);

    const expenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
      
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
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Relatório Mensal
                    </CardTitle>
                    <CardDescription>
                        Analise o fluxo de caixa do mês.
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

  const { categorySpendingData, pieChartData, totalExpenses } = useMemo(() => {
    const spendingMap = new Map<TransactionCategory, number>();

    transactions
      .filter(t => t.type === 'expense' && !t.hideFromReports && !allInvestmentCategories.has(t.category))
      .forEach(t => {
        const category = t.category || 'Outros';
        spendingMap.set(category, (spendingMap.get(category) || 0) + t.amount);
      });

    const aggregatedData = Array.from(spendingMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const total = aggregatedData.reduce((acc, curr) => acc + curr.value, 0);
    
    return { 
        categorySpendingData: aggregatedData, 
        pieChartData: aggregatedData, 
        totalExpenses: total 
    };
  }, [transactions]);
  

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
      
      <div className="grid grid-cols-1 gap-6">
        <TrendAnalysisCard />
        <MonthlyReportCard />
      </div>


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
                <CategoryPieChart data={pieChartData} />
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

    