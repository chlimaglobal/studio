
'use client';

import { useCoupleStore } from '@/hooks/use-couple-store';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, X } from 'lucide-react';
import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/client-providers';
import { rejectPartnerInvite } from '@/app/dashboard/couple/actions';
import { useRouter } from 'next/navigation';

function CancelButton() {
    const { pending } = useFormStatus();
    return (
        <Button
            type="submit"
            variant="destructive"
            className="w-full"
            disabled={pending}
        >
            {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <X className="mr-2 h-4 w-4" />
            )}
            {pending ? 'Cancelando...' : 'Cancelar Convite'}
        </Button>
    )
}

export default function PendingInvitePage() {
  const { invite, status, loading } = useCoupleStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, formAction] = useActionState(rejectPartnerInvite, null);
  const router = useRouter();
  
  useEffect(() => {
    if (state?.error) {
      toast({ variant: 'destructive', title: 'Erro', description: state.error });
    }
    if (state?.success) {
      toast({ title: 'Ação Concluída', description: state.success });
      // After canceling, we should go back to the invite page.
      router.push('/dashboard/couple/invite');
    }
  }, [state, toast, router]);

  // If loading, show a spinner.
  if (loading) {
      return (
        <div className="flex justify-center items-center h-full p-8">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Verificando convites...</span>
            </div>
        </div>
      )
  }

  // If the user lands here but is not in a pending_sent state, redirect them.
  useEffect(() => {
      if (!loading && status !== 'pending_sent') {
          router.replace('/dashboard/couple/invite');
      }
  }, [loading, status, router]);
  
  // Render nothing while redirecting
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
            <form action={formAction} className="w-full">
                <input type="hidden" name="inviteId" value={invite?.inviteId || ''} />
                <input type="hidden" name="userId" value={user?.uid || ''} />
                <CancelButton />
            </form>
        </CardFooter>
      </Card>
    </div>
  );
}
