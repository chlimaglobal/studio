
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Save, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CostOfLivingPage() {
    const [manualCostOfLiving, setManualCostOfLiving] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const storedValue = localStorage.getItem('manualCostOfLiving');
        if (storedValue) {
            setManualCostOfLiving(storedValue);
        }
    }, []);

    const handleSave = () => {
        setIsLoading(true);
        try {
            localStorage.setItem('manualCostOfLiving', manualCostOfLiving);
            toast({
                title: 'Sucesso!',
                description: 'Seu custo de vida foi salvo.',
            });
            router.push('/dashboard');
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro ao Salvar',
                description: 'Não foi possível salvar a configuração.',
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
                            <Home className="h-6 w-6" />
                            Definir Custo de Vida Atual
                        </h1>
                        <p className="text-muted-foreground">Defina um valor fixo para sua meta de custo de vida.</p>
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
                        <Label htmlFor="manual-cost-of-living">Valor (R$)</Label>
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
        </div>
    );
}
