
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, PlusCircle, Star, UserPlus, Shield } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSubscription, useAuth } from '@/components/client-providers';
import { Loader2 } from 'lucide-react';

const PremiumBlocker = () => (
    <div className="flex-1 flex items-center justify-center">
        <Card className="text-center w-full max-w-md">
            <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2">
                    <Star className="h-6 w-6 text-amber-500" />
                    Recurso Premium
                </CardTitle>
                <CardDescription>
                    O Controle Parental é um recurso exclusivo para assinantes.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                    Faça o upgrade para gerenciar as finanças dos seus filhos, configurar mesadas digitais e muito mais.
                </p>
                <Button asChild>
                    <Link href="/dashboard/pricing">Ver Planos</Link>
                </Button>
            </CardContent>
        </Card>
    </div>
);


export default function ParentalControlPage() {
    const router = useRouter();
    const { isSubscribed, isLoading: isSubscriptionLoading } = useSubscription();
    const { user } = useAuth();
    const isAdmin = user?.email === 'digitalacademyoficiall@gmail.com';

    if (isSubscriptionLoading) {
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
        <div className="space-y-6 flex flex-col h-full">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-semibold flex items-center gap-2">
                            <Shield className="h-6 w-6" />
                            Controle Parental
                        </h1>
                        <p className="text-muted-foreground">Gerencie as finanças dos seus dependentes.</p>
                    </div>
                </div>
                 {(isSubscribed || isAdmin) && (
                    <Button>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Adicionar Dependente
                    </Button>
                )}
            </div>
            
             {(!isSubscribed && !isAdmin) ? <PremiumBlocker /> : (
                <div className="flex-1 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
                    <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Nenhum dependente adicionado</h3>
                    <p className="mb-4 mt-2 text-sm text-muted-foreground">
                        Adicione seu primeiro dependente para configurar a mesada digital e acompanhar os gastos.
                    </p>
                    <Button>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Adicionar Dependente
                    </Button>
                </div>
            )}
        </div>
    )
}
