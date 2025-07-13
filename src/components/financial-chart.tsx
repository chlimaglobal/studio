
'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface FinancialChartProps {
  data: { date: string; income: number; expense: number }[];
  isBalanceVisible: boolean;
}

export default function FinancialChart({ data, isBalanceVisible }: FinancialChartProps) {
    const formatCurrency = (value: number) => {
        if (!isBalanceVisible) return 'R$***';
        if (value === 0) return 'R$0';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            notation: 'compact',
            compactDisplay: 'short',
        }).format(value);
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const income = payload.find((p: any) => p.dataKey === 'income')?.value || 0;
            const expense = payload.find((p: any) => p.dataKey === 'expense')?.value || 0;
            
            const formatTooltipCurrency = (value: number) => {
                if (!isBalanceVisible) return 'R$ ●●●●●●';
                return new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(value);
            };

            return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col space-y-1">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Receita
                            </span>
                            <span className="font-bold text-green-500">
                                {formatTooltipCurrency(income)}
                            </span>
                        </div>
                        <div className="flex flex-col space-y-1">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Despesa
                            </span>
                            <span className="font-bold text-red-500">
                                {formatTooltipCurrency(expense)}
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={formatCurrency} />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))' }}
            content={<CustomTooltip />}
          />
          <Bar dataKey="income" fill="hsl(var(--chart-1))" name="Receita" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" fill="hsl(var(--chart-2))" name="Despesa" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
