
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { getFinancialMarketData, FinancialData } from '@/services/market-data';
import { Loader2 } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm text-sm">
                <p className="font-medium">Mês {label}</p>
                <p className="text-muted-foreground">Total: {formatCurrency(payload[0].value)}</p>
            </div>
        );
    }
    return null;
};


export default function InvestmentProjectionCalculator() {
    const [initialAmount, setInitialAmount] = useState(20000);
    const [monthlyContribution, setMonthlyContribution] = useState(500);
    const [period, setPeriod] = useState(36); // months
    const [marketData, setMarketData] = useState<FinancialData | null>(null);

    useEffect(() => {
        async function fetchData() {
            const data = await getFinancialMarketData();
            // Assuming CDI is very close to SELIC and converting annual to monthly
            const monthlyCdi = Math.pow(1 + data.selicRate / 100, 1 / 12) - 1;
            setMarketData({ ...data, selicRate: monthlyCdi }); // Store monthly rate
        }
        fetchData();
    }, []);

    const projectionData = useMemo(() => {
        if (!marketData) return [];

        const cdiRate = marketData.selicRate;
        const data = [];
        let currentValue = initialAmount;

        for (let month = 1; month <= period; month++) {
            // Apply monthly contribution at the start of the month
            if (month > 1) {
                currentValue += monthlyContribution;
            }

            let cdiPercentage;
            if (month <= 6) cdiPercentage = 1.00;
            else if (month <= 12) cdiPercentage = 1.03;
            else if (month <= 18) cdiPercentage = 1.06;
            else if (month <= 24) cdiPercentage = 1.09;
            else cdiPercentage = 1.13;
            
            const monthlyYieldRate = cdiRate * cdiPercentage;
            const yieldAmount = currentValue * monthlyYieldRate;
            currentValue += yieldAmount;

            data.push({ month, value: currentValue });
        }
        return data;
    }, [initialAmount, monthlyContribution, period, marketData]);

    const finalValue = projectionData.length > 0 ? projectionData[projectionData.length - 1].value : initialAmount;
    const totalInvested = initialAmount + monthlyContribution * (period -1 < 0 ? 0 : period -1);
    const totalYield = finalValue - totalInvested;

    if (!marketData) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin"/></div>
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
                 <div>
                    <Label htmlFor="initial-amount">Valor Inicial (R$)</Label>
                    <Input id="initial-amount" type="number" value={initialAmount} onChange={e => setInitialAmount(Number(e.target.value))} />
                </div>
                 <div>
                    <Label htmlFor="monthly-contribution">Aporte Mensal (R$)</Label>
                    <Input id="monthly-contribution" type="number" value={monthlyContribution} onChange={e => setMonthlyContribution(Number(e.target.value))} />
                </div>
                <div>
                    <Label htmlFor="period">Período ({period} meses)</Label>
                    <Slider id="period" min={1} max={120} step={1} value={[period]} onValueChange={([val]) => setPeriod(val)} />
                </div>
            </div>
            <div className="md:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Projeção de Crescimento</CardTitle>
                        <CardDescription>
                            Estimativa do seu patrimônio ao longo do tempo.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                             <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={projectionData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                                    <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                    <YAxis tickFormatter={(value) => `R$${(Number(value) / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                            <div>
                                <p className="text-sm text-muted-foreground">Valor Final</p>
                                <p className="font-bold text-lg text-primary">{formatCurrency(finalValue)}</p>
                            </div>
                             <div>
                                <p className="text-sm text-muted-foreground">Total Investido</p>
                                <p className="font-bold text-lg">{formatCurrency(totalInvested)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Juros Ganhos</p>
                                <p className="font-bold text-lg text-green-500">{formatCurrency(totalYield)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

