
'use client';

import { useCoupleStore } from '@/hooks/use-couple-store';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/client-providers';
import { useRouter } from 'next/navigation';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

export default function InviteReceivedPage() {
    const { invite, status, isLoading: isStoreLoading } = useCoupleStore();
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [isActionLoading, setIsActionLoading] = useState(false);

    // REDIRECT IF NOT EXPECTED STATE
    useEffect(() => {
        if (!isStoreLoading && status !== 'pending_received') {
            router.replace('/dashboard/couple');
        }
    }, [isStoreLoading, status, router]);

    const handleAction = async (action: 'accept' | 'reject') => {
        if (!invite?.inviteId) return;

        setIsActionLoading(true);
        try {
            const callableFunction = action === 'accept' 
                ? httpsCallable(functions, 'acceptPartnerInvite')
                : httpsCallable(functions, 'rejectPartnerInvite');
            
            const result = await callableFunction({ inviteId: invite.inviteId });
            const data = result.data as { success: boolean, message: string, error?: string };

            if (data.success) {
                toast({
                    title: 'Sucesso!',
                    description: data.message,
                });
                if (action === 'accept') {
                    router.push('/dashboard');
                } else {
                    router.push('/dashboard/couple/invite');
                }
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Erro', description: error.message || `Não foi possível ${action === 'accept' ? 'aceitar' : 'recusar'} o convite.` });
        } finally {
             setIsActionLoading(false);
        }
    }

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
                    <Button variant="destructive" onClick={() => handleAction('reject')} disabled={isActionLoading}>
                        {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                        Recusar
                    </Button>
                     <Button onClick={() => handleAction('accept')} disabled={isActionLoading}>
                        {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                        Aceitar
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
