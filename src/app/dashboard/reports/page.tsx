
'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Transaction, TransactionCategory } from '@/lib/types';
import { getStoredTransactions } from '@/lib/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import CategoryPieChart from '@/components/category-pie-chart';
import { transactionCategories } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CategorySpending {
  name: TransactionCategory;
  value: number;
}

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const fetchData = () => {
      const fetchedTransactions = getStoredTransactions();
      const transactionsWithDates = fetchedTransactions.map(t => ({ ...t, date: new Date(t.date) }));
      setTransactions(transactionsWithDates);
    };

    fetchData();
    window.addEventListener('storage', fetchData);
    return () => window.removeEventListener('storage', fetchData);
  }, []);

  const categorySpendingData = useMemo((): CategorySpending[] => {
    const spendingMap = new Map<TransactionCategory, number>();

    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        spendingMap.set(t.category, (spendingMap.get(t.category) || 0) + t.amount);
      });

    return Array.from(spendingMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const totalExpenses = useMemo(() => {
    return categorySpendingData.reduce((acc, curr) => acc + curr.value, 0);
  }, [categorySpendingData]);


  if (!isMounted) {
    return null; // Or a loading skeleton
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Relatórios
        </h1>
        <p className="text-muted-foreground">
          Analise seus dados financeiros com gráficos interativos.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Despesas por Categoria
          </CardTitle>
          <CardDescription>
            Veja como suas despesas estão distribuídas entre as categorias no período.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.filter(t=>t.type==='expense').length > 0 ? (
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
                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `hsl(var(--chart-${(index % 2) + 1}))` }}></span>
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
