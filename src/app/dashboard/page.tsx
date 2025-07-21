
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronLeft, ChevronRight, TrendingUp, BarChart2 } from 'lucide-react';
import FinancialChart from '@/components/financial-chart';
import { subMonths, format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import type { Transaction } from '@/lib/types';
import { getStoredTransactions } from '@/lib/storage';

interface SummaryData {
  recebidos: number;
  despesas: number;
  previsto: number;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
};

export default function DashboardPage() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [transactions, setTransactions] = useState<Transaction[]>(() => getStoredTransactions());

    const handlePrevMonth = () => {
        setCurrentMonth(subMonths(currentMonth, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(addMonths(currentMonth, 1));
    };
    
    const summary: SummaryData = useMemo(() => {
        const monthTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === currentMonth.getMonth() && tDate.getFullYear() === currentMonth.getFullYear();
        });

        const recebidos = monthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const despesas = monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        const previsto = recebidos - despesas;

        return { recebidos, despesas, previsto };
    }, [transactions, currentMonth]);
    
    const generateChartData = (transactions: Transaction[]) => {
        const dataMap = new Map<string, { aReceber: number; aPagar: number; resultado: number }>();

        for (let i = 6; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            const monthKey = format(date, 'MM/yyyy');
            dataMap.set(monthKey, { aReceber: 0, aPagar: 0, resultado: 0 });
        }

        transactions.forEach(t => {
            const tDate = new Date(t.date);
            const monthKey = format(tDate, 'MM/yyyy');

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
        });
        
        return Array.from(dataMap.entries()).map(([date, values]) => ({
            date,
            ...values,
        }));
    };
    
    const chartData = generateChartData(transactions);


  return (
    <div className="space-y-6">
      <Button variant="secondary" className="w-full justify-between h-12">
        <span>Saldo em contas</span>
        <ChevronDown className="h-5 w-5" />
      </Button>

      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="font-semibold capitalize w-28 text-center">
          {format(currentMonth, 'MMMM / yy', { locale: ptBR })}
        </span>
        <Button variant="ghost" size="icon" onClick={handleNextMonth}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="grid grid-cols-3 gap-3 text-center">
        <Card className="bg-secondary p-2">
            <CardHeader className="p-1">
                <CardTitle className="text-xs font-normal text-muted-foreground">Recebidos</CardTitle>
            </CardHeader>
            <CardContent className="p-1">
                 <p className="text-lg font-bold text-green-400">{formatCurrency(summary.recebidos)}</p>
            </CardContent>
        </Card>
         <Card className="bg-secondary p-2">
            <CardHeader className="p-1 flex-row items-center justify-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-red-500"></div>
                <CardTitle className="text-xs font-normal text-muted-foreground">Despesas</CardTitle>
            </CardHeader>
            <CardContent className="p-1">
                 <p className="text-lg font-bold text-red-400">{formatCurrency(summary.despesas)}</p>
            </CardContent>
        </Card>
         <Card className="bg-secondary p-2">
            <CardHeader className="p-1 flex-row items-center justify-center gap-2">
                 <BarChart2 className="h-4 w-4 text-green-400" />
                <CardTitle className="text-xs font-normal text-muted-foreground">Previsto</CardTitle>
            </CardHeader>
            <CardContent className="p-1">
                 <p className="text-lg font-bold text-green-400">{formatCurrency(summary.previsto)}</p>
            </CardContent>
        </Card>
      </div>

       <div>
        <h2 className="text-lg font-semibold mb-2">Resultado mês a mês</h2>
        <div className="h-[250px] w-full">
            <FinancialChart data={chartData} />
        </div>
      </div>

    </div>
  );
}
