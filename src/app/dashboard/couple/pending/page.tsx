
'use client';

import { useCoupleStore } from '@/hooks/use-couple-store';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/client-providers';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

export default function PendingInvitePage() {
  const { invite, status, isLoading: isStoreLoading } = useCoupleStore();
  const { toast } = useToast();
  const router = useRouter();
  const [isActionLoading, setIsActionLoading] = useState(false);
  const { user } = useAuth();

  // Redirect if status is not pending_sent
  useEffect(() => {
    if (!isStoreLoading && status !== 'pending_sent') {
      router.replace('/dashboard/couple');
    }
  }, [isStoreLoading, status, router]);

  const handleCancel = async () => {
    if (!invite?.id) {
      return;
    }

    setIsActionLoading(true);
    try {
      if (!user) throw new Error("Usuário não autenticado.");
      
      const cancelCallable = httpsCallable(functions, 'cancelPartnerInvite');
      const result = await cancelCallable({ inviteId: invite.id });
      const data = result.data as { success: boolean; message: string; error?: string };
      
      if (!data.success) {
        throw new Error(data.error || 'Erro ao cancelar o convite.');
      }

      toast({ title: 'Sucesso!', description: data.message });
      router.push('/dashboard/couple/invite');

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Não foi possível cancelar o convite.',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

    if (isStoreLoading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Verificando convites...</span>
        </div>
      </div>
    );
  }

  // Render nothing if redirecting
  if (status !== 'pending_sent' || !invite) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Convite Enviado
          </CardTitle>
          <CardDescription>
            Um convite foi enviado e está aguardando a aceitação do seu parceiro(a).
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-secondary">
            <p className="text-sm text-muted-foreground">Enviado para:</p>
            <p className="font-semibold text-lg text-primary">{invite?.sentToEmail}</p>
          </div>
        </CardContent>

        <CardFooter>
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleCancel}
            disabled={isActionLoading}
          >
            {isActionLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <X className="mr-2 h-4 w-4" />
            )}
            {isActionLoading ? 'Cancelando...' : 'Cancelar Convite'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
