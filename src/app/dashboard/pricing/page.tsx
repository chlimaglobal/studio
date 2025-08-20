
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { createCheckoutSession, createCustomerPortalSession } from './actions';
import { useAuth, useSubscription } from '@/components/client-providers';
import Link from 'next/link';
import { getAuth } from 'firebase/auth';

const features = [
    "Análises com a Lúmina ilimitadas",
    "Orçamentos personalizados",
    "Metas Financeiras",
    "Sincronização com WhatsApp",
    "Importação de extratos",
    "Acesso Multiplataforma: Use o Finance $ Flow no seu celular (Android, IOS) ou na versão web completa pelo seu computador, a qualquer hora e em qualquer lugar.",
    "Sem anúncios"
];

const PricingCard = ({ title, price, description, priceId, isYearly = false }: { title: string, price: string, description: string, priceId: string, isYearly?: boolean }) => {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();
    const auth = getAuth();

    const handleSubscribe = async () => {
        setIsLoading(true);
        if (!user) {
            toast({ variant: 'destructive', title: 'Você não está logado.', description: 'Faça login para poder assinar.' });
            setIsLoading(false);
            return;
        }

        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error("Não foi possível obter o token de autenticação.");

            const request = new Request('http://localhost', {
                headers: { Authorization: `Bearer ${token}` }
            });

            const { url } = await createCheckoutSession(priceId, request);
            if (url) {
                window.location.href = url;
            } else {
                throw new Error("Não foi possível criar a sessão de checkout.");
            }
        } catch (error) {
            console.error(error);
            const errorMessage = (error instanceof Error) ? error.message : 'Não foi possível iniciar o processo de assinatura. Tente novamente.';
            toast({
                variant: 'destructive',
                title: 'Erro ao Assinar',
                description: errorMessage,
            });
            setIsLoading(false);
        }
    };

    return (
        <Card className={isYearly ? 'border-primary' : ''}>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-baseline">
                    <span className="text-4xl font-bold">{price}</span>
                    <span className="text-muted-foreground">/{isYearly ? 'ano' : 'mês'}</span>
                </div>
                <ul className="space-y-2">
                    {features.map(feature => (
                        <li key={feature} className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-primary" />
                            <span className="text-muted-foreground">{feature}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSubscribe} className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : 'Assinar Agora'}
                </Button>
            </CardFooter>
        </Card>
    );
};


export default function PricingPage() {
    const { user } = useAuth();
    const { isSubscribed, isLoading: isSubscriptionLoading } = useSubscription();
    const { toast } = useToast();
    const [isPortalLoading, setIsPortalLoading] = useState(false);
    const auth = getAuth();

    const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID!;
    const yearlyPriceId = process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID!;

    const handleManageSubscription = async () => {
        setIsPortalLoading(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error("Não foi possível obter o token de autenticação.");
            
            const request = new Request('http://localhost', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const { url } = await createCustomerPortalSession(request);

            if (url) {
                window.location.href = url;
            } else {
                throw new Error("Não foi possível criar a sessão do portal.");
            }
        } catch (error) {
            console.error(error);
             const errorMessage = (error instanceof Error) ? error.message : 'Não foi possível acessar o portal de gerenciamento. Tente novamente.';
             toast({
                variant: 'destructive',
                title: 'Erro',
                description: errorMessage,
            });
            setIsPortalLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="text-center space-y-2 mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Planos e Preços</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Escolha o plano que melhor se adapta às suas necessidades e desbloqueie todo o potencial do FinanceFlow.
                </p>
            </div>
            
             {isSubscriptionLoading ? (
                <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : isSubscribed ? (
                 <Card className="max-w-2xl mx-auto">
                    <CardHeader className="text-center">
                        <CardTitle className="flex justify-center items-center gap-2">
                            <CheckCircle className="h-8 w-8 text-green-500" />
                            Você já é um Assinante!
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-muted-foreground mb-4">
                            Obrigado por apoiar o FinanceFlow. Use o botão abaixo para gerenciar sua assinatura.
                        </p>
                        <Button variant="outline" onClick={handleManageSubscription} disabled={isPortalLoading}>
                            {isPortalLoading ? <Loader2 className="animate-spin mr-2"/> : <Star className="mr-2"/>}
                            Gerenciar minha assinatura
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <PricingCard
                        title="Mensal"
                        price="R$14,90"
                        description="Acesso completo com flexibilidade."
                        priceId={monthlyPriceId}
                    />
                    <PricingCard
                        title="Anual"
                        price="R$99,90"
                        description="O melhor custo-benefício, economize 2 meses!"
                        priceId={yearlyPriceId}
                        isYearly
                    />
                </div>
            )}
            
             <div className="mt-8 text-center">
                 <Button variant="link" asChild>
                    <Link href="/dashboard">Voltar para o painel</Link>
                </Button>
            </div>
        </div>
    );
}
