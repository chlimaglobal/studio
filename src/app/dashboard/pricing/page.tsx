
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { createCheckoutSession, createCustomerPortalSession } from './actions';
import { useAuth, useSubscription } from '@/components/client-providers';
import Link from 'next/link';

const freeFeatures = [
    "Controle de transações (receitas e despesas)",
    "Dashboard com resumo mensal",
    "Cadastro de contas e cartões",
    "Relatórios básicos de gastos",
];

const coupleFeatures = [
    "Tudo do plano Gratuito",
    "Visão compartilhada para 2 membros",
    "Análises com a Lúmina ilimitadas",
    "Metas financeiras de casal (com mediação da Lúmina)",
    "Orçamentos personalizados",
    "Sincronização com WhatsApp",
    "Importação de extratos",
];

const familyFeatures = [
    "Tudo do plano Casal",
    "Até 6 membros no total",
    "Controle parental avançado",
    "Mesada digital programável",
    "Metas e relatórios para dependentes",
    "Conteúdo de educação financeira",
];

const PricingCard = ({ title, price, description, priceId, features, isFeatured = false }: { title: string, price: string, description: string, priceId: string, features: string[], isFeatured?: boolean }) => {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    const handleSubscribe = async () => {
        setIsLoading(true);
        if (!user) {
            toast({ variant: 'destructive', title: 'Você não está logado.', description: 'Faça login para poder assinar.' });
            setIsLoading(false);
            return;
        }

        try {
            const token = await user.getIdToken();
            if (!token) throw new Error("Não foi possível obter o token de autenticação.");
            
            const { url } = await createCheckoutSession(priceId, token);
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
        <Card className={isFeatured ? 'border-primary' : ''}>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-baseline">
                    <span className="text-4xl font-bold">{price}</span>
                    {price !== "Grátis" && <span className="text-muted-foreground">/mês</span>}
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
                 <Button onClick={handleSubscribe} className="w-full" disabled={isLoading || !priceId}>
                    {isLoading ? <Loader2 className="animate-spin" /> : (price === 'Grátis' ? 'Usar plano Gratuito' : 'Assinar Agora')}
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
    const isAdmin = user?.email === 'digitalacademyoficiall@gmail.com';

    const couplePriceId = process.env.NEXT_PUBLIC_STRIPE_COUPLE_PRICE_ID!;
    const familyPriceId = process.env.NEXT_PUBLIC_STRIPE_FAMILY_PRICE_ID!;

    const handleManageSubscription = async () => {
        setIsPortalLoading(true);
        if (!user) {
            toast({ variant: 'destructive', title: 'Você não está logado.' });
            setIsPortalLoading(false);
            return;
        }
        try {
            const token = await user.getIdToken();
            if (!token) throw new Error("Não foi possível obter o token de autenticação.");
            
            const { url } = await createCustomerPortalSession(token);

            if (url) {
                window.location.href = url;
            } else {
                throw new Error("Não foi possível criar a sessão do portal.");
            }
        } catch (error: any) {
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
    
    const renderPricingCards = () => (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
             <PricingCard
                title="Individual"
                price="Grátis"
                description="Comece a organizar suas finanças pessoais hoje mesmo."
                priceId="" // No priceId for free plan
                features={freeFeatures}
            />
            <PricingCard
                title="Casal"
                price="R$19,90"
                description="Ideal para casais que querem gerenciar as finanças juntos."
                priceId={couplePriceId}
                features={coupleFeatures}
                isFeatured={true}
            />
             <PricingCard
                title="Família"
                price="R$34,90"
                description="Gerenciamento completo para toda a família, incluindo filhos."
                priceId={familyPriceId}
                features={familyFeatures}
            />
        </div>
    );

    const renderManageSubscription = () => (
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
    );

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
            ) : (isAdmin || !isSubscribed) ? (
                renderPricingCards()
            ) : (
                renderManageSubscription()
            )}
            
             <div className="mt-8 text-center">
                 <Button variant="link" asChild>
                    <Link href="/dashboard">Voltar para o painel</Link>
                </Button>
            </div>
        </div>
    );
}
