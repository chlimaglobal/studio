'use client';

import { useCoupleStore } from '@/hooks/use-couple-store';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, X } from 'lucide-react';
import { useActionState, useEffect } from 'react';
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

    // ACTION STATES
    const [rejectState, rejectAction] = useActionState(rejectPartnerInvite, null);
    const [acceptState, acceptAction] = useActionState(acceptPartnerInvite, null);

    // REDIRECT IF NOT EXPECTED STATE
    useEffect(() => {
        if (!loading && status !== 'pending_received') {
            router.replace('/dashboard/couple/invite');
        }
    }, [loading, status, router]);

    // TOASTS – REJECT
    useEffect(() => {
        if (rejectState?.error) {
            toast({ variant: 'destructive', title: 'Erro', description: rejectState.error });
        }
        if (rejectState?.success) {
            toast({ title: 'Ação Concluída', description: rejectState.message });
            router.refresh(); // Refresh to update store and UI
        }
    }, [rejectState, toast, router]);

    // TOASTS – ACCEPT
    useEffect(() => {
        if (acceptState?.error) {
            toast({ variant: 'destructive', title: 'Erro ao aceitar', description: acceptState.error });
        }
        if (acceptState?.success) {
            toast({ title: 'Sucesso!', description: 'Vocês agora estão vinculados!' });
            router.push('/dashboard');
        }
    }, [acceptState, toast, router]);


    if (loading) {
        return (
            <div className="flex justify-center items-center h-full p-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Verificando convites...</span>
                </div>
            </div>
        );
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
                        <b>{invite.sentByName || 'Alguém'}</b> ({invite.sentByEmail}) convidou você para vincular as contas.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Ao aceitar, vocês poderão compartilhar transações, orçamentos e análises no “Modo Casal”.
                    </p>
                </CardContent>

                <CardFooter className="grid grid-cols-2 gap-4">

                    {/* REJECT */}
                    <form action={rejectAction}>
                        <input type="hidden" name="inviteId" value={invite.inviteId} />
                        <input type="hidden" name="userId" value={user?.uid} />
                        <ActionButton variant="reject">
                            <X className="mr-2 h-4 w-4" /> Recusar
                        </ActionButton>
                    </form>

                    {/* ACCEPT */}
                    <form action={acceptAction}>
                        <input type="hidden" name="inviteId" value={invite.inviteId} />
                        <input type="hidden" name="userId" value={user?.uid} />
                        <ActionButton variant="accept">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Aceitar
                        </ActionButton>
                    </form>

                </CardFooter>
            </Card>
        </div>
    );
}
