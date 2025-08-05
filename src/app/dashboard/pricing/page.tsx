
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { createCheckoutSession, createCustomerPortalSession } from './actions';
import { useAuth } from '@/app/layout';

const features = [
    "Análises com IA ilimitadas",
    "Orçamentos personalizados",
    "Sincronização com WhatsApp",
    "Importação de extratos",
    "Sem anúncios"
];

const PricingCard = ({ title, price, description, priceId, isYearly = false }: { title: string, price: string, description: string, priceId: string, isYearly?: boolean }) => {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleSubscribe = async () => {
        setIsLoading(true);
        try {
            // Because we cannot securely get user on server action, we show a toast for now.
            // In a real app, the commented out code in actions.ts would be used.
            toast({
                title: 'Funcionalidade em Demonstração',
                description: 'A criação de assinatura está desabilitada neste ambiente.',
            });
            setIsLoading(false);
            // const { url } = await createCheckoutSession(priceId);
            // if (url) {
            //     window.location.href = url;
            // } else {
            //     throw new Error("Não foi possível criar a sessão de checkout.");
            // }
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
    const { toast } = useToast();
    const [isPortalLoading, setIsPortalLoading] = useState(false);

    const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID!;
    const yearlyPriceId = process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID!;

    const handleManageSubscription = async () => {
        setIsPortalLoading(true);
        try {
            // Similar to subscribe, this is disabled for demonstration.
            toast({
                title: 'Funcionalidade em Demonstração',
                description: 'O portal de gerenciamento de assinaturas está desabilitado neste ambiente.',
            });
            setIsPortalLoading(false);

            // const { url } = await createCustomerPortalSession();
            // if (url) {
            //     window.location.href = url;
            // } else {
            //     throw new Error("Não foi possível criar a sessão do portal.");
            // }
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
        <div className="container mx-auto max-w-4xl py-12">
            <div className="text-center space-y-4 mb-12">
                <h1 className="text-4xl font-bold tracking-tight">Planos e Preços</h1>
                <p className="text-lg text-muted-foreground">
                    Escolha o plano que melhor se adapta às suas necessidades e desbloqueie todo o potencial do FinanceFlow.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
            
             <div className="text-center mt-12">
                <p className="text-muted-foreground mb-2">Já é assinante?</p>
                <Button variant="outline" onClick={handleManageSubscription} disabled={isPortalLoading}>
                    {isPortalLoading ? <Loader2 className="animate-spin mr-2"/> : <Star className="mr-2"/>}
                    Gerenciar minha assinatura
                </Button>
            </div>
        </div>
    );
}
