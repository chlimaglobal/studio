
'use client';

import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Area, AreaChart, Bar, BarChart } from 'recharts';
import { formatCurrency } from '@/lib/utils';


const CustomTooltip = ({ active, payload, label, isPrivacyMode }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
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
            <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <defs>
                    <linearGradient id="colorResultado" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.2)" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={yAxisFormatter} />
                <Tooltip
                    content={<CustomTooltip isPrivacyMode={isPrivacyMode} />}
                    cursor={{ fill: 'hsl(var(--muted))' }}
                />
                 <Legend
                    verticalAlign="top"
                    align="right"
                    iconSize={10}
                    wrapperStyle={{ top: -10, right: 0 }}
                    formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
                <Bar dataKey="aReceber" name="Receitas" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="aPagar" name="Despesas" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                 <Line 
                    type="monotone" 
                    dataKey="resultado" 
                    name="Resultado" 
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2 }} 
                    activeDot={{ r: 6 }} 
                />
                 <Area type="monotone" dataKey="resultado" stroke="hsl(var(--primary))" fill="url(#colorResultado)" />
            </BarChart>
        </ResponsiveContainer>
    );
}
