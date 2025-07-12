import { getTransactions } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, TrendingDown, TrendingUp } from 'lucide-react';
import FinancialChart from '@/components/financial-chart';
import TransactionsTable from '@/components/transactions-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRightLeft } from 'lucide-react';

export default async function DashboardPage() {

  const transactions = await getTransactions();

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpenses;

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-500">{formatCurrency(totalIncome)}</div>
            <p className="text-xs text-muted-foreground">no período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Totais</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-500">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">no período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
            <p className="text-xs text-muted-foreground">Balanço total</p>
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
