
'use client';

import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, ReferenceLine } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface FinancialChartProps {
    data: {
        date: string;
        aReceber: number;
        aPagar: number;
        resultado: number;
    }[];
    isPrivacyMode: boolean;
    costOfLiving: number;
}

export default function FinancialChart({ data, isPrivacyMode, costOfLiving }: FinancialChartProps) {

    return (
        <ResponsiveContainer width="100%" height="100%">
            
            {/* MARGENS AJUSTADAS PARA EVITAR GRÁFICO CORTADO */}
            <LineChart 
                data={data} 
                margin={{ top: 10, right: 20, left: 20, bottom: 30 }}
            >
                <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--border) / 0.2)"
                    vertical={false}
                />

                {/* EIXO X — agora com labels visíveis e não cortados */}
                <XAxis 
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                />

                <YAxis 
                    tickLine={false}
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(v) => formatCurrency(v)}
                />

                <Tooltip 
                    formatter={(v) => (isPrivacyMode ? '••••' : formatCurrency(Number(v)))}
                    content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                            return (
                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                    <p className="font-bold text-sm mb-1">{label}</p>
                                    {payload.map((p, i) => (
                                        <p key={i} style={{ color: p.color }} className="text-xs">
                                            {`${p.name}: ${isPrivacyMode ? 'R$ ••••' : formatCurrency(p.value as number)}`}
                                        </p>
                                    ))}
                                </div>
                            );
                        }
                        return null;
                    }}
                />

                <Legend wrapperStyle={{paddingTop: '20px'}}/>

                {/* 🔥 LINHAS DO GRÁFICO — corrigido stroke invertido */}

                {/* DESPESAS = Vermelho = chart-1 */}
                <Line
                    type="monotone"
                    dataKey="aPagar"
                    name="Despesas"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                />

                {/* RECEITAS = Verde = chart-2 */}
                <Line
                    type="monotone"
                    dataKey="aReceber"
                    name="Receitas"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                />

                {/* BALANÇO (mantido igual) */}
                <Line
                    type="monotone"
                    dataKey="resultado"
                    name="Balanço"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                />

                {/* Linha do custo de vida */}
                {costOfLiving > 0 && !isPrivacyMode && (
                    <ReferenceLine 
                        y={costOfLiving} 
                        stroke="hsl(var(--chart-4))" 
                        strokeDasharray="4 4" 
                        label={{ value: "Custo de Vida", fill: "hsl(var(--muted-foreground))", fontSize: 12, position: "right"}}
                    />
                )}
            </LineChart>
        </ResponsiveContainer>
    );
}
