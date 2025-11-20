'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Save, Home, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CostOfLivingPage() {
    const [manualCostOfLiving, setManualCostOfLiving] = useState('');
    const [monthlyIncome, setMonthlyIncome] = useState('');
    const [payday, setPayday] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const storedCost = localStorage.getItem('manualCostOfLiving');
        if (storedCost) setManualCostOfLiving(storedCost);
        
        const storedIncome = localStorage.getItem('monthlyIncome');
        if (storedIncome) setMonthlyIncome(storedIncome);

        const storedPayday = localStorage.getItem('payday');
        if (storedPayday) setPayday(storedPayday);

    }, []);

    const handleSave = () => {
        setIsLoading(true);
        try {
            localStorage.setItem('manualCostOfLiving', manualCostOfLiving);
            localStorage.setItem('monthlyIncome', monthlyIncome);
            localStorage.setItem('payday', payday);
            toast({
                title: 'Sucesso!',
                description: 'Suas configurações financeiras foram salvas.',
            });
            router.push('/dashboard/profile');
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro ao Salvar',
                description: 'Não foi possível salvar as configurações.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-semibold flex items-center gap-2">
                            <DollarSign className="h-6 w-6" />
                            Metas Financeiras
                        </h1>
                        <p className="text-muted-foreground">Defina sua renda e sua meta de custo de vida.</p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Custo de Vida Mensal (Manual)</CardTitle>
                    <CardDescription>
                        Insira o valor que você considera seu custo de vida mensal. Este valor será usado como uma linha de referência no gráfico do seu painel. Se deixado em branco ou 0, o sistema calculará uma média automaticamente.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div>
                        <Label htmlFor="manual-cost-of-living">Valor do Custo de Vida (R$)</Label>
                        <Input
                            id="manual-cost-of-living"
                            type="text"
                            inputMode="decimal"
                            placeholder="Ex: 3500,00"
                            value={manualCostOfLiving}
                            onChange={(e) => setManualCostOfLiving(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Renda Familiar</CardTitle>
                    <CardDescription>
                        Informe sua renda mensal e principal dia de pagamento para que a Lúmina possa fornecer análises mais precisas.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <Label htmlFor="monthly-income">Renda Mensal (familiar)</Label>
                        <Input 
                            id="monthly-income" 
                            type="text"
                            inputMode="decimal"
                            placeholder="Ex: 5000,00"
                            value={monthlyIncome}
                            onChange={(e) => setMonthlyIncome(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label htmlFor="payday">Principal Dia do Pagamento</Label>
                        <Input 
                            id="payday" 
                            type="number"
                            min="1" max="31"
                            placeholder="Ex: 5"
                            value={payday}
                            onChange={(e) => setPayday(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
