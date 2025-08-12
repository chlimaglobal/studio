
'use client';

import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/lib/utils';


const CustomTooltip = ({ active, payload, label, isPrivacyMode }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="rounded-lg border border-border bg-popover p-3 shadow-sm text-sm">
                <p className="font-bold mb-2">{label}</p>
                <div className="space-y-1">
                     <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: payload[0].color}}></div>
                        <span className="text-muted-foreground">Patrimônio:</span>
                        <span className="font-semibold">{isPrivacyMode ? 'R$ ••••••' : formatCurrency(data.patrimonio)}</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};


interface FinancialChartProps {
    data: {
        date: string;
        patrimonio: number;
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
    
    const minPatrimonio = Math.min(...data.map(d => d.patrimonio));
    const maxPatrimonio = Math.max(...data.map(d => d.patrimonio));
    
    const getPath = (x: number, y: number, width: number, height: number) => {
        return `M${x},${y} L${x + width},${y} L${x + width},${y + height} L${x},${y + height} Z`;
    };

    const CustomDot = (props: any) => {
        const { cx, cy, payload, color } = props;
        const { patrimonio } = payload;
        
        const percentage = (patrimonio - minPatrimonio) / (maxPatrimonio - minPatrimonio);
        // Interpolate between red (hsl(0, 72%, 51%)) and green (hsl(142, 71%, 45%))
        const hue = 0 + percentage * (142 - 0);
        const dotColor = `hsl(${hue}, 70%, 48%)`;

        return <circle cx={cx} cy={cy} r={5} stroke={dotColor} strokeWidth={2} fill="#fff" />;
    };


    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                 <defs>
                    <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                        <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.2)" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={yAxisFormatter} />
                <Tooltip
                    content={<CustomTooltip isPrivacyMode={isPrivacyMode} />}
                    cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Line 
                    type="monotone" 
                    dataKey="patrimonio" 
                    name="Patrimônio" 
                    stroke="url(#colorPatrimonio)" 
                    strokeWidth={3} 
                    dot={<CustomDot />} 
                    activeDot={{ r: 6 }} 
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
