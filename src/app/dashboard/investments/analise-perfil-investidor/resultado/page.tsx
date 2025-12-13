
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart2, TrendingUp, PieChartIcon, UserCheck, Info, ChevronRight, PiggyBank, FilePieChart, Repeat } from 'lucide-react';
import type { InvestorProfileOutput } from '@/lib/definitions';
import CategoryPieChart from '@/components/category-pie-chart';
import Link from 'next/link';

const recommendationActions = [
    {
        keywords: ['diversificar', 'renda fixa'],
        title: "Diversificar Investimentos",
        description: "Adicione um novo ativo de Renda Fixa à sua carteira.",
        href: "/dashboard/add-transaction?category=Renda%20Fixa",
        icon: FilePieChart
    },
    {
        keywords: ['reserva de emergência'],
        title: "Criar Reserva de Emergência",
        description: "Comece a construir seu colchão de segurança para imprevistos.",
        href: "/dashboard/goals",
        icon: PiggyBank
    },
    {
        keywords: ['revise sua carteira', 'periodicamente'],
        title: "Revisar Carteira",
        description: "Acesse seus relatórios para analisar o desempenho e alinhamento.",
        href: "/dashboard/reports",
        icon: Repeat
    }
];

const getActionForRecommendation = (recommendation: string) => {
    const lowerCaseRec = recommendation.toLowerCase();
    return recommendationActions.find(action => action.keywords.some(kw => lowerCaseRec.includes(kw)));
};


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
                  <h1 className="text-2xl font-semibold">Seu Perfil e Sugestões</h1>
                  <p className="text-muted-foreground">Análise e recomendações da Lúmina.</p>
                </div>
            </div>

            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
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
                    <CardTitle className="flex items-center gap-2"><PieChartIcon /> Estratégia de Carteira Sugerida</CardTitle>
                    <CardDescription>Uma sugestão de como diversificar seus investimentos com base no seu perfil.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                     <div className="h-[300px]">
                        <CategoryPieChart data={pieChartData} />
                    </div>
                     <div className="space-y-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Rentabilidade Real Projetada</CardDescription>
                                <CardTitle className="text-3xl text-primary">{result.expectedReturn}</CardTitle>
                            </CardHeader>
                             <CardContent>
                                <p className="text-xs text-muted-foreground">
                                    Esta é a projeção de ganho acima da inflação, com base na sua carteira sugerida e nas condições atuais do mercado.
                                </p>
                            </CardContent>
                        </Card>
                         <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Info className="h-4 w-4" />
                            <span>Esta é uma simulação. A rentabilidade pode variar.</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><TrendingUp /> Próximos Passos</CardTitle>
                    <CardDescription>Recomendações práticas da Lúmina para você começar.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {result.recommendations.map((rec, index) => {
                        const action = getActionForRecommendation(rec);
                        if (action) {
                            return (
                                <Link href={action.href} key={index} passHref>
                                    <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg border cursor-pointer">
                                        <div className="flex items-center gap-4">
                                            <action.icon className="h-6 w-6 text-primary" />
                                            <div>
                                                <p className="font-semibold">{action.title}</p>
                                                <p className="text-sm text-muted-foreground">{rec}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                </Link>
                            )
                        }
                        // Fallback for non-actionable recommendations
                        return (
                            <div key={index} className="flex items-start gap-3 p-3 rounded-md bg-muted/50 border">
                                <span className="flex h-2 w-2 translate-y-2 rounded-full bg-primary" />
                                <span className="text-sm">{rec}</span>
                            </div>
                        )
                    })}
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
