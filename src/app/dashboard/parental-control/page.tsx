
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, PlusCircle, Star, UserPlus, Shield, Users, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSubscription, useAuth } from '@/components/client-providers';
import { Loader2 } from 'lucide-react';
import { AddDependentDialog } from '@/components/add-dependent-dialog';
import { useState, useEffect } from 'react';
import { AppUser } from '@/lib/types';
import { onUserUpdate } from '@/lib/storage';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';


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
    const [dependents, setDependents] = useState<AppUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const isAdmin = user?.email === 'digitalacademyoficiall@gmail.com';

    useEffect(() => {
        if (!user || (!isSubscribed && !isAdmin)) {
            setIsLoading(false);
            return;
        }

        const unsub = onUserUpdate(user.uid, async (parentData) => {
            if (parentData?.dependents) {
                const dependentUids = Object.keys(parentData.dependents);
                const dependentsData = await Promise.all(
                    dependentUids.map(async (uid) => {
                        let dependentInfo: AppUser | null = null;
                        const unsubDep = onUserUpdate(uid, (depData) => {
                            if (depData) {
                                dependentInfo = depData;
                            }
                        });
                        // A simple getDoc might be better if we don't need realtime updates for the list
                        // For now, this will work but has performance implications on larger lists
                        await new Promise(res => setTimeout(res, 200)); // give snapshot a moment
                        unsubDep();
                        return dependentInfo;
                    })
                );
                setDependents(dependentsData.filter((d): d is AppUser => d !== null));
            }
             setIsLoading(false);
        });

        return () => unsub();

    }, [user, isSubscribed, isAdmin]);

    if (isSubscriptionLoading || isLoading) {
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
                    <AddDependentDialog>
                        <Button>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Adicionar Dependente
                        </Button>
                    </AddDependentDialog>
                )}
            </div>
            
             {(!isSubscribed && !isAdmin) ? <PremiumBlocker /> : (
                dependents.length > 0 ? (
                     <div className="space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2"><Users /> Dependentes Conectados</h2>
                        {dependents.map(dep => (
                            <Link key={dep.uid} href={`/dashboard/parental-control/${dep.uid}`}>
                                <Card className="hover:border-primary cursor-pointer">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-12 w-12">
                                                <AvatarImage src={dep.photoURL || undefined} />
                                                <AvatarFallback>{dep.displayName?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold">{dep.displayName}</p>
                                                <p className="text-sm text-muted-foreground">{dep.email}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                     </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
                        <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">Nenhum dependente adicionado</h3>
                        <p className="mb-4 mt-2 text-sm text-muted-foreground">
                            Adicione seu primeiro dependente para configurar a mesada digital e acompanhar os gastos.
                        </p>
                        <AddDependentDialog>
                            <Button>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Adicionar Dependente
                            </Button>
                        </AddDependentDialog>
                    </div>
                )
            )}
        </div>
    )
}
