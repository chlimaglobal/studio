
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, TrendingDown, TrendingUp, Wallet, ArrowRightLeft } from 'lucide-react';
import FinancialChart from '@/components/financial-chart';
import TransactionsTable from '@/components/transactions-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Transaction } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { getStoredTransactions } from '@/lib/storage';
import { subDays, format } from 'date-fns';

interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

interface DailyBalance {
  dailyBudget: number | null;
  daysUntilPayday: number | null;
  paydayProgress: number | null;
}

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({ totalIncome: 0, totalExpenses: 0, balance: 0 });
  const [dailyBalance, setDailyBalance] = useState<DailyBalance>({ dailyBudget: null, daysUntilPayday: null, paydayProgress: null });
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = () => {
    const fetchedTransactions = getStoredTransactions();

    const transactionsWithDates = fetchedTransactions.map(t => ({...t, date: new Date(t.date)}));
    setTransactions(transactionsWithDates);

    const totalIncome = transactionsWithDates
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalExpenses = transactionsWithDates
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    
    const balance = totalIncome - totalExpenses;
    setSummary({ totalIncome, totalExpenses, balance });
    
    calculateDailyBalance(balance);

    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();

    window.addEventListener('storage', fetchData);
    return () => window.removeEventListener('storage', fetchData);

  }, []);

  const calculateDailyBalance = (currentBalance: number) => {
    const payday = Number(localStorage.getItem('payday'));
    if (!payday || payday < 1 || payday > 31) {
      setDailyBalance({ dailyBudget: null, daysUntilPayday: null, paydayProgress: null });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let nextPaydayDate = new Date(currentYear, currentMonth, payday);
    if (currentDay > payday) {
      nextPaydayDate = new Date(currentYear, currentMonth + 1, payday);
    }

    let lastPaydayDate = new Date(currentYear, currentMonth, payday);
     if (currentDay <= payday) {
        lastPaydayDate.setMonth(lastPaydayDate.getMonth() - 1);
    }


    const timeDiff = nextPaydayDate.getTime() - today.getTime();
    const daysUntilPayday = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
    
    const totalDaysInCycle = (nextPaydayDate.getTime() - lastPaydayDate.getTime()) / (1000 * 3600 * 24);
    const daysPassedInCycle = totalDaysInCycle - daysUntilPayday;
    const paydayProgress = totalDaysInCycle > 0 ? (daysPassedInCycle / totalDaysInCycle) * 100 : 0;

    const dailyBudget = daysUntilPayday > 0 ? currentBalance / daysUntilPayday : currentBalance;

    setDailyBalance({ dailyBudget, daysUntilPayday, paydayProgress });
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };
  
  const generateChartData = (transactions: Transaction[]) => {
    const data: { [key: string]: { date: string; income: number; expense: number } } = {};
    const thirtyDaysAgo = subDays(new Date(), 30);

    for (let i = 0; i < 30; i++) {
        const date = subDays(new Date(), i);
        const formattedDate = format(date, 'yyyy-MM-dd');
        const dayLabel = format(date, 'dd');
        data[formattedDate] = { date: dayLabel, income: 0, expense: 0 };
    }
    
    transactions.forEach(t => {
        if (t.date >= thirtyDaysAgo) {
            const formattedDate = format(t.date, 'yyyy-MM-dd');
            if (data[formattedDate]) {
                if (t.type === 'income') {
                    data[formattedDate].income += t.amount;
                } else {
                    data[formattedDate].expense += t.amount;
                }
            }
        }
    });

    return Object.values(data).sort((a,b) => a.date.localeCompare(b.date));
  };

  const chartData = generateChartData(transactions);


  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-500">{formatCurrency(summary.totalIncome)}</div>
            <p className="text-xs text-muted-foreground">no período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Totais</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-500">{formatCurrency(summary.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">no período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.balance)}</div>
            <p className="text-xs text-muted-foreground">Balanço total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Diário</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dailyBalance.dailyBudget !== null ? (
              <>
                <div className="text-2xl font-bold">{formatCurrency(dailyBalance.dailyBudget)}</div>
                <p className="text-xs text-muted-foreground">
                  {`para gastar por dia até o próximo pagamento`}
                </p>
                {dailyBalance.paydayProgress !== null && (
                  <div className="mt-2">
                     <Progress value={dailyBalance.paydayProgress} className="h-2"/>
                     <p className="text-xs text-muted-foreground text-right mt-1">
                        {dailyBalance.daysUntilPayday} dias restantes
                     </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground text-center pt-4">
                <p>Defina sua renda e dia do pagamento nas <Link href="/dashboard/settings" className="underline text-primary">Configurações</Link> para ver seu saldo diário.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Visão Geral (Últimos 30 dias)</CardTitle>
            <CardDescription>Comparativo de receitas e despesas por dia.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <FinancialChart data={chartData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
