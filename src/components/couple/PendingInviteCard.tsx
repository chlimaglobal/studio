
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, UserPlus, X, Loader2 } from 'lucide-react';
import { useCoupleStore } from '@/hooks/use-couple-store';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '../client-providers';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useState } from 'react';

export function PendingInviteCard() {
    const { invite, status } = useCoupleStore();
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleAction = async (action: 'accept' | 'reject') => {
        if (!invite?.inviteId) return;

        setIsLoading(true);
        try {
            const callableFunction = action === 'accept'
                ? httpsCallable(functions, 'acceptPartnerInviteClient')
                : httpsCallable(functions, 'rejectPartnerInvite');
            
            const result = await callableFunction({ inviteId: invite.inviteId });
            const data = result.data as { success: boolean, message?: string };

            if (data.success) {
                toast({
                    title: 'Sucesso!',
                    description: action === 'accept' ? 'Você e seu parceiro(a) estão conectados!' : 'Convite recusado/cancelado.',
                });
                // The store will auto-update via the listener
            } else {
                // @ts-ignore
                throw new Error(data.error || 'Ocorreu um erro.');
            }
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || `Falha ao ${action === 'accept' ? 'aceitar' : 'recusar'} o convite.`,
            });
        } finally {
            setIsLoading(false);
        }
    };


    if (!invite || status === 'linked') return null;

    // --- Caso: convite enviado por você ---
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
                     <Button variant="destructive" className="w-full" disabled={isLoading} onClick={() => handleAction('reject')}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                        Cancelar Convite
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    // --- Caso: convite recebido ---
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
                    <Button variant="destructive" className="w-full" disabled={isLoading} onClick={() => handleAction('reject')}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                        Recusar
                    </Button>
                    <Button className="w-full" disabled={isLoading} onClick={() => handleAction('accept')}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                        Aceitar
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    return null;
}
