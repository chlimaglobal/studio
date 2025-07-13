
'use client';

import { getTransactions } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, TrendingDown, TrendingUp, CalendarDays, Wallet } from 'lucide-react';
import FinancialChart from '@/components/financial-chart';
import TransactionsTable from '@/components/transactions-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRightLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Transaction } from '@/lib/types';
import { Progress } from '@/components/ui/progress';

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

  useEffect(() => {
    async function fetchData() {
      const fetchedTransactions = await getTransactions();
      setTransactions(fetchedTransactions);

      const totalIncome = fetchedTransactions
        .filter((t) => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);

      const totalExpenses = fetchedTransactions
        .filter((t) => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);
      
      const balance = totalIncome - totalExpenses;
      setSummary({ totalIncome, totalExpenses, balance });
      
      calculateDailyBalance(balance);

      setIsLoading(false);
    }
    
    fetchData();

    // Listener para atualizar os dados quando as configurações mudarem
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
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let nextPaydayDate = new Date(currentYear, currentMonth, payday);
    if (today > nextPaydayDate) {
      // Se já passou o dia do pagamento neste mês, calcule para o próximo mês
      nextPaydayDate = new Date(currentYear, currentMonth + 1, payday);
    }

    const lastPaydayDate = new Date(currentYear, currentMonth, payday);
     if (today < lastPaydayDate) {
        lastPaydayDate.setMonth(lastPaydayDate.getMonth() - 1);
    }


    const timeDiff = nextPaydayDate.getTime() - today.getTime();
    const daysUntilPayday = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    const totalDaysInCycle = (nextPaydayDate.getTime() - lastPaydayDate.getTime()) / (1000 * 3600 * 24);
    const daysPassedInCycle = totalDaysInCycle - daysUntilPayday;
    const paydayProgress = (daysPassedInCycle / totalDaysInCycle) * 100;

    const dailyBudget = daysUntilPayday > 0 ? currentBalance / daysUntilPayday : currentBalance;

    setDailyBalance({ dailyBudget, daysUntilPayday, paydayProgress });
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const chartData = transactions
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .reduce((acc, t) => {
      const month = t.date.toLocaleString('pt-BR', { month: 'short' });
      const existing = acc.find((item) => item.month === month);
      if (existing) {
        if (t.type === 'income') {
          existing.income += t.amount;
        } else {
          existing.expense += t.amount;
        }
      } else {
        acc.push({
          month,
          income: t.type === 'income' ? t.amount : 0,
          expense: t.type === 'expense' ? t.amount : 0,
        });
      }
      return acc;
    }, [] as { month: string; income: number; expense: number }[]);


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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>Visão Geral</CardTitle>
            <CardDescription>Comparativo de receitas e despesas ao longo do tempo.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <FinancialChart data={chartData} />
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Transações Recentes</CardTitle>
                    <CardDescription>As últimas 5 movimentações.</CardDescription>
                </div>
                 <Button asChild variant="outline" size="sm">
                    <Link href="#">
                        Ver todas
                        <ArrowRightLeft className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                <TransactionsTable transactions={transactions.slice(0, 5)} />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
