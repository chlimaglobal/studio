
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, LineChart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { useTransactions } from '@/components/client-providers';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { ResponsiveContainer, LineChart as RechartsLineChart, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';
import { allInvestmentCategories } from '@/lib/types';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm text-sm">
                <p className="font-medium">Ano {new Date().getFullYear() + label}</p>
                <p className="text-muted-foreground">Patrimônio: {formatCurrency(payload[0].value)}</p>
            </div>
        );
    }
    return null;
};


export default function RetirementCalculatorPage() {
  const router = useRouter();
  const { transactions, isLoading: isLoadingTransactions } = useTransactions();
  
  const [currentAge, setCurrentAge] = useState(30);
  const [retirementAge, setRetirementAge] = useState(65);
  const [desiredIncome, setDesiredIncome] = useState(10000);
  const [currentPatrimony, setCurrentPatrimony] = useState(0);
  const [realYield, setRealYield] = useState(6); // % ao ano, acima da inflação

  // Calculate initial patrimony from transactions once
  useEffect(() => {
    if (transactions.length > 0) {
        const totalInvested = transactions
            .filter(t => allInvestmentCategories.has(t.category))
            .reduce((acc, t) => {
                if (t.type === 'income') return acc + t.amount;
                if (t.type === 'expense') return acc - t.amount; // Assume retiradas são despesas
                return acc;
            }, 0);
        setCurrentPatrimony(totalInvested > 0 ? totalInvested : 0);
    }
  }, [transactions]);


  const { monthlyInvestmentNeeded, projectionData } = useMemo(() => {
    const lifeExpectancy = 85;
    const retirementYears = lifeExpectancy - retirementAge;
    const investmentYears = retirementAge - currentAge;

    if (investmentYears <= 0) return { monthlyInvestmentNeeded: 0, projectionData: [] };

    const monthlyRealYield = Math.pow(1 + realYield / 100, 1 / 12) - 1;

    // A. Quanto precisa ter na aposentadoria (Present Value of an annuity)
    const totalNestEggNeeded = (desiredIncome * 12 * (1 - Math.pow(1 + monthlyRealYield, -retirementYears * 12))) / monthlyRealYield;

    // B. Quanto já terá no futuro apenas com o patrimônio atual (Future Value)
    const futureValueOfCurrentPatrimony = currentPatrimony * Math.pow(1 + monthlyRealYield, investmentYears * 12);

    // C. Qual o valor futuro necessário a partir dos aportes mensais
    const futureValueFromContributions = totalNestEggNeeded - futureValueOfCurrentPatrimony;
    
    if (futureValueFromContributions <= 0) {
        // O patrimônio atual já é suficiente
        return { monthlyInvestmentNeeded: 0, projectionData: [] };
    }

    // D. Qual o aporte mensal necessário (Future value of a series)
    const monthlyInvestment = futureValueFromContributions / ((Math.pow(1 + monthlyRealYield, investmentYears * 12) - 1) / monthlyRealYield);
    
    // Gerar dados para o gráfico
    const projData = [];
    let accumulated = currentPatrimony;
    for (let year = 0; year <= investmentYears; year++) {
        projData.push({ year, value: accumulated });
        accumulated = accumulated * Math.pow(1 + realYield / 100, 1) + (monthlyInvestment * 12);
    }

    return { monthlyInvestmentNeeded: monthlyInvestment, projectionData: projData };

  }, [currentAge, retirementAge, desiredIncome, currentPatrimony, realYield]);


  if (isLoadingTransactions) {
    return (
        <div className="flex justify-center items-center h-full p-8">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Carregando...</span>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Calculadora de Projeto de Vida</h1>
          <p className="text-muted-foreground">Descubra quanto investir para alcançar sua aposentadoria.</p>
        </div>
      </div>
      
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>Parâmetros</CardTitle>
                        <CardDescription>Ajuste os valores para simular sua aposentadoria.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <Label htmlFor="current-age">Idade Atual</Label>
                                <Input id="current-age" type="number" value={currentAge} onChange={e => setCurrentAge(Number(e.target.value))} />
                            </div>
                            <div>
                                <Label htmlFor="retirement-age">Idade Aposentadoria</Label>
                                <Input id="retirement-age" type="number" value={retirementAge} onChange={e => setRetirementAge(Number(e.target.value))} />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="desired-income">Renda Mensal Desejada</Label>
                            <Input id="desired-income" type="number" value={desiredIncome} onChange={e => setDesiredIncome(Number(e.target.value))} />
                        </div>
                        <div>
                            <Label htmlFor="current-patrimony">Patrimônio Atual</Label>
                            <Input id="current-patrimony" type="number" value={currentPatrimony} onChange={e => setCurrentPatrimony(Number(e.target.value))} />
                        </div>
                         <div>
                            <Label htmlFor="real-yield">Taxa de Juros Real (anual %)</Label>
                            <Input id="real-yield" type="number" step="0.1" value={realYield} onChange={e => setRealYield(Number(e.target.value))} />
                             <p className="text-xs text-muted-foreground mt-1">Seu retorno esperado acima da inflação.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-3 space-y-4">
                <Card className="bg-gradient-to-br from-primary/10 to-transparent text-center">
                    <CardHeader>
                        <CardTitle>Seu Objetivo Mensal</CardTitle>
                        <CardDescription>Para alcançar sua meta de aposentadoria, você precisa investir:</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-primary">{formatCurrency(monthlyInvestmentNeeded)}</p>
                        <p className="text-muted-foreground">por mês.</p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><LineChart className="h-5 w-5"/> Projeção de Patrimônio</CardTitle>
                        <CardDescription>A evolução do seu dinheiro ao longo do tempo se seguir o plano.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                         <ResponsiveContainer width="100%" height="100%">
                            <RechartsLineChart data={projectionData}>
                                <Tooltip content={<CustomTooltip />}/>
                                <XAxis dataKey="year" fontSize={12} tickFormatter={(val) => `${new Date().getFullYear() + val}`} />
                                <YAxis fontSize={12} tickFormatter={(val) => `${formatCurrency(val / 1000)}k`} />
                                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                            </RechartsLineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
