
      
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, LineChart, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { useTransactions } from '@/components/client-providers';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { ResponsiveContainer, LineChart as RechartsLineChart, XAxis, YAxis, Tooltip, Legend, Line, ReferenceLine } from 'recharts';
import { allInvestmentCategories, investmentWithdrawalCategories } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm text-sm">
                <p className="font-medium">Ano {new Date().getFullYear() + label}</p>
                 {payload.map((p: any) => (
                    <p key={p.dataKey} style={{ color: p.color }}>
                        {p.name}: {formatCurrency(p.value)}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};


export default function RetirementPlannerPage() {
  const router = useRouter();
  const { transactions, isLoading: isLoadingTransactions } = useTransactions();
  
  // Partner 1
  const [age1, setAge1] = useState(30);
  const [income1, setIncome1] = useState(5000);
  
  // Partner 2
  const [age2, setAge2] = useState(28);
  const [income2, setIncome2] = useState(4000);

  // Shared Goals
  const [retirementAge, setRetirementAge] = useState(65);
  const [lifeExpectancy, setLifeExpectancy] = useState(85);
  const [currentPatrimony, setCurrentPatrimony] = useState(50000);
  const [monthlySavings, setMonthlySavings] = useState(1500);
  const [desiredRetirementIncome, setDesiredRetirementIncome] = useState(10000);
  
  // Financial Assumptions
  const [realYield, setRealYield] = useState(4); // Real return % per year
  const [inflationRate, setInflationRate] = useState(3); // Inflation % per year

  // Auto-fill current patrimony from transactions
  useEffect(() => {
    if (transactions.length > 0) {
        const totalInvested = transactions
            .filter(t => allInvestmentCategories.has(t.category))
            .reduce((acc, t) => {
                if (t.type === 'income') return acc + t.amount;
                // Treat withdrawals as negative contributions to patrimony
                if (t.type === 'expense' && investmentWithdrawalCategories.has(t.category)) return acc - t.amount;
                if (t.type === 'expense') return acc + t.amount;
                return acc;
            }, 0);
        setCurrentPatrimony(totalInvested > 0 ? totalInvested : 0);
    }
  }, [transactions]);


  const {
    futureDesiredIncome,
    totalNestEggNeeded,
    projectedPatrimony,
    isOnTrack,
    projectionData,
    difference,
  } = useMemo(() => {
    const avgCurrentAge = (age1 + age2) / 2;
    const investmentYears = retirementAge - avgCurrentAge;
    if (investmentYears <= 0) return { projectionData: [], isOnTrack: false, futureDesiredIncome: 0, totalNestEggNeeded: 0, projectedPatrimony: 0, difference: 0 };

    // 1. Calculate the future value of the desired income due to inflation
    const futureDesiredIncome = desiredRetirementIncome * Math.pow(1 + inflationRate / 100, investmentYears);

    // 2. Calculate the total capital needed at retirement (Nest Egg)
    const retirementDuration = lifeExpectancy - retirementAge;
    const monthlyRealYield = Math.pow(1 + realYield / 100, 1 / 12) - 1;
    
    // Using Present Value of an Annuity formula for the nest egg
    const totalNestEggNeeded = retirementDuration > 0
        ? (futureDesiredIncome / monthlyRealYield) * (1 - Math.pow(1 + monthlyRealYield, -retirementDuration * 12))
        : 0;


    // 3. Project the growth of current savings + future contributions
    let accumulated = currentPatrimony;
    const projData = [{ year: 0, patrimony: currentPatrimony, goal: totalNestEggNeeded }];
    
    for (let year = 1; year <= investmentYears; year++) {
      accumulated = accumulated * (1 + realYield / 100) + (monthlySavings * 12);
      projData.push({ year, patrimony: accumulated, goal: totalNestEggNeeded });
    }
    const projectedPatrimony = accumulated;
    
    // 4. Determine status
    const isOnTrack = projectedPatrimony >= totalNestEggNeeded;
    const difference = projectedPatrimony - totalNestEggNeeded;

    return {
        futureDesiredIncome,
        totalNestEggNeeded,
        projectedPatrimony,
        isOnTrack,
        projectionData: projData,
        difference,
    };

  }, [
    age1, age2, retirementAge, lifeExpectancy, currentPatrimony, 
    monthlySavings, desiredRetirementIncome, realYield, inflationRate
  ]);


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
          <h1 className="text-2xl font-semibold">Calculadora de Aposentadoria</h1>
          <p className="text-muted-foreground">Planeje o futuro financeiro do casal.</p>
        </div>
      </div>
      
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-4">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/> Dados do Casal</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <Label htmlFor="age1">Idade (Parceiro 1)</Label>
                                <Input id="age1" type="number" value={age1} onChange={e => setAge1(Number(e.target.value))} />
                            </div>
                            <div>
                                <Label htmlFor="age2">Idade (Parceiro 2)</Label>
                                <Input id="age2" type="number" value={age2} onChange={e => setAge2(Number(e.target.value))} />
                            </div>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                <Label htmlFor="retirementAge">Idade Aposentadoria</Label>
                                <Input id="retirementAge" type="number" value={retirementAge} onChange={e => setRetirementAge(Number(e.target.value))} />
                            </div>
                            <div>
                                <Label htmlFor="lifeExpectancy">Expectativa de Vida</Label>
                                <Input id="lifeExpectancy" type="number" value={lifeExpectancy} onChange={e => setLifeExpectancy(Number(e.target.value))} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Situação Financeira</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="current-patrimony">Economia Atual (R$)</Label>
                            <Input id="current-patrimony" type="number" value={currentPatrimony} onChange={e => setCurrentPatrimony(Number(e.target.value))} />
                        </div>
                        <div>
                            <Label htmlFor="monthly-savings">Quanto poupam por mês (R$)</Label>
                            <Input id="monthly-savings" type="number" value={monthlySavings} onChange={e => setMonthlySavings(Number(e.target.value))} />
                        </div>
                        <div>
                            <Label htmlFor="desired-income">Renda Desejada na Aposentadoria (R$)</Label>
                            <Input id="desired-income" type="number" value={desiredRetirementIncome} onChange={e => setDesiredRetirementIncome(Number(e.target.value))} />
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Premissas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="real-yield">Taxa de Juros Real (% ao ano)</Label>
                            <Input id="real-yield" type="number" step="0.1" value={realYield} onChange={e => setRealYield(Number(e.target.value))} />
                             <p className="text-xs text-muted-foreground mt-1">Retorno esperado acima da inflação.</p>
                        </div>
                         <div>
                            <Label htmlFor="inflation-rate">Taxa de Inflação (% ao ano)</Label>
                            <Input id="inflation-rate" type="number" step="0.1" value={inflationRate} onChange={e => setInflationRate(Number(e.target.value))} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-3 space-y-4">
                <Card className={`text-center ${isOnTrack ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
                    <CardHeader>
                        <CardTitle className={isOnTrack ? 'text-green-600' : 'text-destructive'}>
                            {isOnTrack ? "Vocês estão no caminho certo!" : "Atenção, ajuste necessário!"}
                        </CardTitle>
                        <CardDescription>
                            Com base nos seus aportes atuais, seu patrimônio projetado na aposentadoria é de {formatCurrency(projectedPatrimony)}.
                            Sua meta de patrimônio é de {formatCurrency(totalNestEggNeeded)}.
                            A diferença é de <span className={isOnTrack ? 'text-green-600 font-bold' : 'text-destructive font-bold'}>{formatCurrency(difference)}</span>.
                        </CardDescription>
                    </CardHeader>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><LineChart className="h-5 w-5"/> Projeção de Patrimônio</CardTitle>
                        <CardDescription>A evolução do seu dinheiro ao longo do tempo.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                         <ResponsiveContainer width="100%" height="100%">
                            <RechartsLineChart data={projectionData}>
                                <Tooltip content={<CustomTooltip />}/>
                                <XAxis dataKey="year" fontSize={12} tickFormatter={(val) => `${new Date().getFullYear() + val}`} />
                                <YAxis fontSize={12} domain={['auto', 'dataMax + 10000']} tickFormatter={(val) => `${formatCurrency(val / 1000)}k`} />
                                <Legend />
                                <Line type="monotone" name="Seu Patrimônio" dataKey="patrimony" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                                <ReferenceLine y={totalNestEggNeeded} name="Sua Meta" stroke="hsl(var(--chart-1))" strokeDasharray="3 3" />
                            </RechartsLineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Relatório Detalhado</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                         <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Renda desejada (hoje)</span>
                            <span className="font-semibold">{formatCurrency(desiredRetirementIncome)} /mês</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Renda desejada corrigida</span>
                            <span className="font-semibold">{formatCurrency(futureDesiredIncome)} /mês</span>
                        </div>
                         <Separator />
                         <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Patrimônio necessário</span>
                            <span className="font-semibold text-primary">{formatCurrency(totalNestEggNeeded)}</span>
                        </div>
                         <Separator />
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Patrimônio projetado</span>
                            <span className="font-semibold">{formatCurrency(projectedPatrimony)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}

    