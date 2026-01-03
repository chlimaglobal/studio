
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, UserPlus, X, Loader2 } from 'lucide-react';
import { useCoupleStore } from '@/hooks/use-couple-store';
import { useAuth } from '@/components/client-providers';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { app } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface PendingInviteCardProps {}

export function PendingInviteCard(props: PendingInviteCardProps) {
  const { invite, status } = useCoupleStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleAction = async (action: 'accept' | 'reject' | 'cancel') => {
    if (!invite?.id || !user) return;
    setIsLoading(true);

    let functionName: string;
    if (action === 'accept') functionName = 'acceptPartnerInvite';
    else if (action === 'reject') functionName = 'declinePartnerInvite';
    else functionName = 'cancelPartnerInvite';

    try {
      const functions = getFunctions(app, 'us-central1');
      const callable = httpsCallable(functions, functionName);
      const result = await callable({ inviteId: invite.id });
      const data = result.data as { success: boolean; message: string; error?: string };
      
      if (data.success) {
        toast({ title: 'Sucesso!', description: data.message });
        router.refresh();
      } else {
        throw new Error(data.error);
      }

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Erro',
            description: error.message || `Não foi possível ${action} o convite.`,
        });
    } finally {
        setIsLoading(false);
    }
  }

  if (!invite || status === 'linked') return null;

  // --- Case: YOU sent the invite ---
  if (status === 'pending_sent') {
    return (
      <Card className="max-w-md mx-auto bg-secondary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Convite Enviado
          </CardTitle>
          <CardDescription>
            Aguardando resposta de <strong>{invite.sentToEmail}</strong>.
          </CardDescription>
        </CardHeader>
        <CardFooter>
            <Button
                variant="destructive"
                className="w-full"
                disabled={isLoading}
                onClick={() => handleAction('cancel')}
             >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                Cancelar Convite
            </Button>
        </CardFooter>
      </Card>
    );
  }

  // --- Case: YOU received the invite ---
  if (status === 'pending_received') {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            Você tem um convite!
          </CardTitle>
          <CardDescription>
            <strong>{invite.sentByName || 'Alguém'}</strong> ({invite.sentByEmail}) convidou você.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aceitando, vocês ativam o Modo Casal.
          </p>
        </CardContent>
        <CardFooter className="grid grid-cols-2 gap-4">
             <Button
                variant="destructive"
                disabled={isLoading}
                onClick={() => handleAction('reject')}
            >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />} 
                Recusar
            </Button>
             <Button
                disabled={isLoading}
                onClick={() => handleAction('accept')}
            >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />} 
                Aceitar
            </Button>
        </CardFooter>
      </Card>
    );
  }

  return null;
}
