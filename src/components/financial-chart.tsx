
'use client';

import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';


const CustomTooltip = ({ active, payload, label, isPrivacyMode }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg border border-border bg-popover p-3 shadow-sm text-sm">
                <p className="font-bold mb-2">{label}</p>
                <div className="space-y-1">
                    {payload.map((p: any) => (
                         <div key={p.dataKey} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: p.color}}></div>
                            <span className="text-muted-foreground">{p.name}:</span>
                            <span className="font-semibold">{isPrivacyMode ? 'R$ ••••••' : formatCurrency(p.value)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};


interface FinancialChartProps {
    data: {
        date: string;
        aReceber: number;
        aPagar: number;
        resultado: number;
    }[];
    isPrivacyMode: boolean;
}

export default function FinancialChart({ data, isPrivacyMode }: FinancialChartProps) {
    const yAxisFormatter = (value: number) => {
        if (isPrivacyMode) return '••••';
        if (value === 0) return 'R$0';
        const absValue = Math.abs(value);
        if (absValue >= 1000) {
            return `R$${(value / 1000).toFixed(0)}k`;
        }
        return `R$${value}`;
    };
    
    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.2)" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={yAxisFormatter} width={50} />
                <Tooltip
                    content={<CustomTooltip isPrivacyMode={isPrivacyMode} />}
                    cursor={{ fill: 'hsl(var(--muted))' }}
                />
                 <Legend
                    verticalAlign="bottom"
                    align="center"
                    iconSize={10}
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
                <Line type="monotone" dataKey="aReceber" name="A receber" stroke="hsl(var(--chart-1))" strokeWidth={2.5} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                <Line type="monotone" dataKey="aPagar" name="A pagar" stroke="hsl(var(--chart-2))" strokeWidth={2.5} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                <Line type="monotone" dataKey="resultado" name="Resultado" stroke="hsl(var(--chart-3))" strokeWidth={2.5} dot={{ r: 5 }} activeDot={{ r: 7 }} />
            </LineChart>
        </ResponsiveContainer>
    );
}
