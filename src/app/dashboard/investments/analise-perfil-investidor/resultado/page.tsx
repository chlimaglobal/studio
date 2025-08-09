
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart2, Lightbulb, PieChartIcon, UserCheck } from 'lucide-react';
import type { InvestorProfileOutput } from '@/lib/types';
import CategoryPieChart from '@/components/category-pie-chart';

const ProfileResultContent = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const analysisResultString = searchParams.get('analysisResult');

    if (!analysisResultString) {
        return (
            <div className="text-center text-muted-foreground">
                <p>Nenhum resultado de análise encontrado.</p>
                <Button variant="link" onClick={() => router.push('/dashboard/investments')}>
                    Voltar para Investimentos
                </Button>
            </div>
        );
    }

    const result: InvestorProfileOutput = JSON.parse(analysisResultString);

    const pieChartData = result.assetAllocation.map(item => ({
        name: item.category,
        value: item.percentage
    }));

    const profileColors: Record<string, string> = {
        'Conservador': 'text-blue-500',
        'Moderado': 'text-amber-500',
        'Arrojado': 'text-red-500'
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/investments')}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div>
                  <h1 className="text-2xl font-semibold">Seu Perfil de Investidor</h1>
                  <p className="text-muted-foreground">Análise e recomendações da Lúmina.</p>
                </div>
            </div>

            <Card className="border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <UserCheck className="h-8 w-8 text-primary" />
                        <div>
                            <span>Seu perfil é:</span>
                            <span className={`ml-2 ${profileColors[result.profile] || 'text-primary'}`}>{result.profile}</span>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">{result.analysis}</p>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PieChartIcon /> Alocação de Carteira Sugerida</CardTitle>
                    <CardDescription>Uma sugestão de como diversificar seus investimentos com base no seu perfil.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="h-[300px]">
                        <CategoryPieChart data={pieChartData} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Lightbulb /> Próximos Passos</CardTitle>
                    <CardDescription>Recomendações práticas da Lúmina para você começar.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-3">
                        {result.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-3 p-3 rounded-md bg-muted/50 border">
                                <span className="flex h-2 w-2 translate-y-2 rounded-full bg-primary" />
                                <span className="text-sm">{rec}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ResultPage() {
    return (
        <Suspense fallback={<div>Carregando resultado...</div>}>
            <ProfileResultContent />
        </Suspense>
    )
}
