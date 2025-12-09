'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Sparkles, Goal, Heart, Users, FilePieChart, Repeat, PiggyBank, ChevronRight, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import type { MediateGoalsInput, MediateGoalsOutput } from '@/lib/types';
import { runGoalMediation } from '../actions';

const ResultDisplay = ({ result, onReset }: { result: MediateGoalsOutput, onReset: () => void }) => {
    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
             <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold">Plano de Metas do Casal</h1>
                  <p className="text-muted-foreground">Uma sugestão da Lúmina para vocês conquistarem juntos.</p>
                </div>
                 <Button onClick={onReset} variant="outline">Analisar Novas Metas</Button>
            </div>
            
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Sparkles className="h-8 w-8 text-primary" />
                        <span>Resumo do Plano</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">{result.summary}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Plano de Ação Conjunto</CardTitle>
                    <CardDescription>Esta é a nova alocação mensal sugerida para a poupança de vocês.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                         <div className="flex justify-between items-center p-3 border rounded-lg">
                            <div>
                                <p className="text-sm text-muted-foreground">Meta do Parceiro A</p>
                                <p className="font-bold text-lg text-primary">{formatCurrency(result.jointPlan.partnerAPortion)}/mês</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Novo Prazo</p>
                                <p className="font-semibold">{result.jointPlan.partnerANewMonths} meses</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center p-3 border rounded-lg">
                            <div>
                                <p className="text-sm text-muted-foreground">Meta do Parceiro B</p>
                                <p className="font-bold text-lg text-primary">{formatCurrency(result.jointPlan.partnerBPortion)}/mês</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Novo Prazo</p>
                                <p className="font-semibold">{result.jointPlan.partnerBNewMonths} meses</p>
                            </div>
                        </div>
                         {result.jointPlan.unallocated > 0 && (
                             <div className="flex justify-between items-center p-3 border rounded-lg bg-secondary">
                                <div>
                                    <p className="text-sm text-muted-foreground">Valor não alocado</p>
                                    <p className="font-bold text-lg text-green-500">{formatCurrency(result.jointPlan.unallocated)}/mês</p>
                                </div>
                                <p className="text-xs text-muted-foreground max-w-[150px] text-right">Pode ser usado para acelerar uma meta ou para outras despesas!</p>
                            </div>
                         )}
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-semibold mb-2">Análise da Lúmina</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.analysis}</p>
                    </div>
                </CardContent>
            </Card>
            
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Goal /> Próximos Passos</CardTitle>
                    <CardDescription>Recomendações práticas para vocês começarem hoje mesmo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {result.actionSteps.map((step, index) => (
                        <div key={index} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg border">
                            <div className="flex items-center gap-4">
                                <Check className="h-6 w-6 text-green-500" />
                                <div>
                                    <p className="font-semibold">{step.title}</p>
                                    <p className="text-sm text-muted-foreground">{step.description}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}

export default function MediateGoalsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // State for inputs
  const [partnerADesc, setPartnerADesc] = useState('');
  const [partnerAAmount, setPartnerAAmount] = useState<number | ''>('');
  const [partnerAMonths, setPartnerAMonths] = useState<number | ''>('');
  
  const [partnerBDesc, setPartnerBDesc] = useState('');
  const [partnerBAmount, setPartnerBAmount] = useState<number | ''>('');
  const [partnerBMonths, setPartnerBMonths] = useState<number | ''>('');
  
  const [sharedMonthlySavings, setSharedMonthlySavings] = useState<number | ''>(2000);

  // State for result
  const [analysisResult, setAnalysisResult] = useState<MediateGoalsOutput | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const input: MediateGoalsInput = {
        partnerAGoal: {
            description: partnerADesc,
            amount: Number(partnerAAmount),
            months: Number(partnerAMonths),
        },
        partnerBGoal: {
            description: partnerBDesc,
            amount: Number(partnerBAmount),
            months: Number(partnerBMonths),
        },
        sharedMonthlySavings: Number(sharedMonthlySavings),
    };

    try {
        const result = await runGoalMediation(input);
        setAnalysisResult(result);
    } catch (error) {
        console.error("Mediation failed:", error);
        toast({
            variant: "destructive",
            title: "Erro na Análise",
            description: "Não foi possível mediar as metas. Verifique os valores e tente novamente."
        });
    } finally {
        setIsLoading(false);
    }
  };

  if (analysisResult) {
      return <ResultDisplay result={analysisResult} onReset={() => setAnalysisResult(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Mediação de Metas</h1>
          <p className="text-muted-foreground">Alinhem seus sonhos financeiros com a ajuda da Lúmina.</p>
        </div>
      </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users /> Poupança do Casal</CardTitle>
                    <CardDescription>Quanto vocês conseguem economizar juntos por mês?</CardDescription>
                </CardHeader>
                <CardContent>
                    <Label htmlFor="shared-savings">Total da Economia Mensal (R$)</Label>
                    <Input id="shared-savings" type="number" placeholder="ex: 2000" required value={sharedMonthlySavings} onChange={e => setSharedMonthlySavings(Number(e.target.value) || '')} />
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Heart className="text-pink-500" /> Meta do Parceiro(a) A</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="partnerA-desc">Descrição da Meta</Label>
                            <Input id="partnerA-desc" placeholder="ex: Viagem de luxo" required value={partnerADesc} onChange={e => setPartnerADesc(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="partnerA-amount">Valor (R$)</Label>
                            <Input id="partnerA-amount" type="number" placeholder="ex: 24000" required value={partnerAAmount} onChange={e => setPartnerAAmount(Number(e.target.value) || '')} />
                        </div>
                        <div>
                            <Label htmlFor="partnerA-months">Prazo (meses)</Label>
                            <Input id="partnerA-months" type="number" placeholder="ex: 12" required value={partnerAMonths} onChange={e => setPartnerAMonths(Number(e.target.value) || '')} />
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Heart className="text-blue-500" /> Meta do Parceiro(a) B</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="partnerB-desc">Descrição da Meta</Label>
                            <Input id="partnerB-desc" placeholder="ex: Quitar hipoteca" required value={partnerBDesc} onChange={e => setPartnerBDesc(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="partnerB-amount">Valor (R$)</Label>
                            <Input id="partnerB-amount" type="number" placeholder="ex: 6000" required value={partnerBAmount} onChange={e => setPartnerBAmount(Number(e.target.value) || '')} />
                        </div>
                        <div>
                            <Label htmlFor="partnerB-months">Prazo (meses)</Label>
                            <Input id="partnerB-months" type="number" placeholder="ex: 12" required value={partnerBMonths} onChange={e => setPartnerBMonths(Number(e.target.value) || '')} />
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Pedir ajuda à Lúmina
            </Button>
        </form>
    </div>
  );
}
