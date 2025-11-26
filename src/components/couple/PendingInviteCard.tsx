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
import { useAuth } from '../client-providers';
import { useActionState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFormStatus } from 'react-dom';


type ServerAction = (formData: FormData) => Promise<{ success: boolean; error?: string; message?: string } | null>;

interface PendingInviteCardProps {
    acceptAction: ServerAction;
    rejectAction: ServerAction;
}


function ActionButton({ variant, children, action }: { variant: 'accept' | 'reject', children: React.ReactNode, action: ServerAction }) {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            variant={variant === 'accept' ? 'default' : 'destructive'}
            className="w-full"
            disabled={pending}
            formAction={action}
        >
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : children}
        </Button>
    )
}

export function PendingInviteCard({ acceptAction, rejectAction }: PendingInviteCardProps) {
  const { invite, status } = useCoupleStore();
  const { user } = useAuth();
  const { toast } = useToast();

  const [acceptState, wrappedAcceptAction] = useActionState(acceptAction, null);
  const [rejectState, wrappedRejectAction] = useActionState(rejectAction, null);

  useEffect(() => {
    if (rejectState?.error) toast({ variant: 'destructive', title: 'Erro', description: rejectState.error });
    if (rejectState?.success) toast({ title: 'Sucesso', description: rejectState.message });

    if (acceptState?.error) toast({ variant: 'destructive', title: 'Erro ao aceitar', description: acceptState.error });
    if (acceptState?.success) toast({ title: 'Sucesso!', description: 'Vocês agora estão conectados!' });

  }, [acceptState, rejectState, toast]);


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
            <form action={wrappedRejectAction} className="w-full">
                <input type="hidden" name="inviteId" value={invite.inviteId || ''} />
                <input type="hidden" name="userId" value={user?.uid || ''} />
                <ActionButton variant="reject" action={wrappedRejectAction}>
                    <X className="mr-2 h-4 w-4" />
                    Cancelar Convite
                </ActionButton>
            </form>
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
            <form action={wrappedRejectAction}>
                <input type="hidden" name="inviteId" value={invite.inviteId || ''} />
                <input type="hidden" name="userId" value={user?.uid || ''} />
                <ActionButton variant="reject" action={wrappedRejectAction}>
                    <X className="mr-2 h-4 w-4" /> Recusar
                </ActionButton>
            </form>
             <form action={wrappedAcceptAction}>
                <input type="hidden" name="inviteId" value={invite.inviteId || ''} />
                <input type="hidden" name="userId" value={user?.uid || ''} />
                <ActionButton variant="accept" action={wrappedAcceptAction}>
                    <UserPlus className="mr-2 h-4 w-4" /> Aceitar
                </ActionButton>
            </form>
        </CardFooter>
      </Card>
    );
  }

  return null;
}
