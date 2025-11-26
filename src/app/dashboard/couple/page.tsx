
'use client';

import { useCoupleStore } from '@/hooks/use-couple-store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Heart, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PartnerInfoCard } from '@/components/couple/PartnerInfoCard';

export default function CoupleHomePage() {
  const { status, isLoading } = useCoupleStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (status === 'single') {
        router.replace('/dashboard/couple/invite');
      } else if (status === 'pending_sent') {
        router.replace('/dashboard/couple/pending');
      } else if (status === 'pending_received') {
        router.replace('/dashboard/couple/invite-received');
      }
    }
  }, [status, isLoading, router]);
  
  if (isLoading || status !== 'linked') {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando informações do casal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="text-center">
            <h1 className="text-2xl font-semibold flex items-center justify-center gap-2">
                <Heart className="h-6 w-6 text-pink-500"/>
                Modo Casal
            </h1>
            <p className="text-muted-foreground">Gerenciem suas finanças em conjunto.</p>
       </div>

      <PartnerInfoCard />

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users /> Funcionalidades Compartilhadas</CardTitle>
            <CardDescription>Acesse os recursos disponíveis para vocês.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" size="lg" onClick={() => router.push('/dashboard/lumina')}>Mural do Casal</Button>
            <Button variant="outline" size="lg" onClick={() => router.push('/dashboard/reports')}>Relatórios Combinados</Button>
            <Button variant="outline" size="lg" onClick={() => router.push('/dashboard/budgets')}>Orçamentos do Casal</Button>
            <Button variant="outline" size="lg" onClick={() => router.push('/dashboard/mediate-goals')}>Mediação de Metas</Button>
        </CardContent>
      </Card>
    </div>
  );
}
