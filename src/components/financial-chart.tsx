
'use client';

import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Area, AreaChart, Dot } from 'recharts';

interface FinancialChartProps {
  data: { date: string; aReceber: number; aPagar: number; resultado: number }[];
}

const formatCurrency = (value: number) => {
    if (value === 0) return '0';
    const absValue = Math.abs(value);
    if (absValue >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toString();
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="rounded-lg border border-border bg-popover p-3 shadow-sm text-sm">
                <p className="font-bold mb-2">{label}</p>
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[hsl(var(--chart-1))]"></div>
                        <span className="text-muted-foreground">A receber:</span>
                        <span className="font-semibold">{data.aReceber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[hsl(var(--chart-2))]"></div>
                        <span className="text-muted-foreground">A pagar:</span>
                        <span className="font-semibold">{data.aPagar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                     <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[hsl(var(--chart-3))]"></div>
                        <span className="text-muted-foreground">Resultado:</span>
                        <span className="font-semibold">{data.resultado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const CustomizedDot = (props: any) => {
    const { cx, cy, stroke, payload, value } = props;
    if (value !== 0) {
        return <Dot {...props} r={4} strokeWidth={2} />;
    }
    return null;
};


export default function FinancialChart({ data }: FinancialChartProps) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                 <defs>
                    <linearGradient id="colorResultado" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.2)" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={formatCurrency} />
                <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Legend 
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', paddingTop: '10px' }}
                />
                <Area type="monotone" dataKey="resultado" name="Resultado" stroke="hsl(var(--chart-3))" strokeWidth={2} fill="url(#colorResultado)" activeDot={{r: 6}} />
                <Line type="monotone" dataKey="aReceber" name="A receber" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={<CustomizedDot />} />
                <Line type="monotone" dataKey="aPagar" name="A pagar" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={<CustomizedDot />} />
            </AreaChart>
        </ResponsiveContainer>
    );
}
