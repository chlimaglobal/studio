'use client';

import { useCoupleStore } from '@/hooks/use-couple-store';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, UserPlus, X } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { acceptPartnerInvite, rejectPartnerInvite } from '@/app/dashboard/couple/invite/actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/client-providers';
import { useRouter } from 'next/navigation';

function ActionButton({ variant, children }: { variant: 'accept' | 'reject', children: React.ReactNode }) {
    const { pending } = useFormStatus();
    return (
        <Button
            type="submit"
            variant={variant === 'accept' ? 'default' : 'destructive'}
            className="w-full"
            disabled={pending}
        >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
        </Button>
    )
}

export default function InviteReceivedPage() {
    const { invite, status, loading } = useCoupleStore();
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [isAccepting, setIsAccepting] = useState(false);
    const [rejectState, rejectAction] = useActionState(rejectPartnerInvite, null);
    
     useEffect(() => {
        // Redirect away if state is not correct
        if (!loading && status !== 'pending_received') {
            router.replace('/dashboard/couple/invite');
        }
    }, [loading, status, router]);

    useEffect(() => {
        if (rejectState?.error) {
          toast({ variant: 'destructive', title: 'Erro', description: rejectState.error });
        }
        if (rejectState?.success) {
          toast({ title: 'Ação Concluída', description: rejectState.success });
        }
    }, [rejectState, toast]);

    const handleAccept = async () => {
        if (!invite?.inviteId || !user?.uid) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível aceitar o convite.' });
            return;
        }
        setIsAccepting(true);
        try {
            const result = await acceptPartnerInvite(invite.inviteId, user.uid);
            if (result.success) {
                toast({ title: 'Sucesso!', description: 'Você e seu parceiro(a) estão conectados!' });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
            toast({ variant: 'destructive', title: 'Erro ao aceitar', description: errorMessage });
        } finally {
            setIsAccepting(false);
        }
    };


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

    if (status !== 'pending_received' || !invite) {
        return null;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-full p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserPlus className="h-6 w-6 text-primary" />
                        Você tem um convite!
                    </CardTitle>
                    <CardDescription>
                        <b>{invite.sentByName || 'Alguém'}</b> ({invite.sentByEmail}) convidou você para vincular as contas no FinanceFlow.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Ao aceitar, vocês poderão compartilhar transações, orçamentos e análises no "Modo Casal". Seus dados financeiros individuais permanecerão separados.
                    </p>
                </CardContent>
                <CardFooter className="grid grid-cols-2 gap-4">
                    <form action={rejectAction}>
                        <input type="hidden" name="inviteId" value={invite.inviteId} />
                        <input type="hidden" name="userId" value={user?.uid} />
                        <ActionButton variant="reject">
                            <X className="mr-2 h-4 w-4" /> Recusar
                        </ActionButton>
                    </form>
                    <Button onClick={handleAccept} disabled={isAccepting}>
                        {isAccepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                        Aceitar
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
