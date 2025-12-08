'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Star, UserPlus, Shield, Users, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSubscription, useAuth } from '@/components/client-providers';
import { Loader2 } from 'lucide-react';
import { AddDependentDialog } from '@/components/add-dependent-dialog';
import { useState, useEffect } from 'react';
import { AppUser } from '@/lib/types';
import { onUserUpdate } from '@/lib/storage';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';


// 🔒 BLOQUEIO PREMIUM
const PremiumBlocker = () => (
  <div className="flex-1 flex items-center justify-center">
    <Card className="text-center w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2">
          <Star className="h-6 w-6 text-amber-500" />
          Recurso Premium
        </CardTitle>
        <CardDescription>
          O Controle Parental é exclusivo para assinantes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Faça upgrade para gerenciar as finanças dos seus filhos, configurar mesadas e muito mais.
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

  // 🔥 Admin destrava tudo sem assinatura
  const isAdmin = user?.email === 'digitalacademyoficiall@gmail.com';


  // 📌 CARREGA DEPENDENTES DO USUÁRIO
  useEffect(() => {
    if (!user || (!isSubscribed && !isAdmin)) {
      setIsLoading(false);
      return;
    }

    const unsubscribeParent = onUserUpdate(user.uid, async (parentData) => {
      if (parentData?.dependents) {
        const dependentUids = Object.keys(parentData.dependents);

        const dependentsData = await Promise.all(
          dependentUids.map(async (depUid) => {
            let depInfo: AppUser | null = null;

            // 🔧 Observa o dependente uma única vez
            const unsub = onUserUpdate(depUid, (snapshot) => {
              if (snapshot) depInfo = snapshot;
            });

            // Aguarda o snapshot
            await new Promise((res) => setTimeout(res, 120));

            unsub();
            return depInfo;
          })
        );

        setDependents(dependentsData.filter((d): d is AppUser => d !== null));
      }

      setIsLoading(false);
    });

    return () => unsubscribeParent();
  }, [user, isSubscribed, isAdmin]);



  // LOADING GLOBAL
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

      {/* HEADER */}
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
            <p className="text-muted-foreground">
              Gerencie as finanças dos seus dependentes.
            </p>
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



      {/* BLOQUEIO OU LISTA */}
      {(!isSubscribed && !isAdmin) ? (
        <PremiumBlocker />
      ) : dependents.length > 0 ? (

        /* LISTA DE DEPENDENTES */
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Dependentes Conectados
          </h2>

          {dependents.map((dep) => (
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

        /* ESTADO VAZIO */
        <div className="flex-1 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Nenhum dependente adicionado</h3>

          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            Adicione seu primeiro dependente para configurar a mesada e acompanhar os gastos.
          </p>

          <AddDependentDialog>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Adicionar Dependente
            </Button>
          </AddDependentDialog>
        </div>

      )}

    </div>
  );
}
