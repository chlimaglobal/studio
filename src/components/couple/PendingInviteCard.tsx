'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, UserPlus, X } from 'lucide-react';
import { useFormState, useFormStatus } from 'react-dom';
import { acceptPartnerInvite, rejectPartnerInvite } from '@/app/dashboard/couple/actions';
import { useCoupleStore } from '@/hooks/use-couple-store';
import { Loader2 } from 'lucide-react';

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

export function PendingInviteCard() {
    const { invite } = useCoupleStore();
    const [acceptState, acceptAction] = useFormState(acceptPartnerInvite, null);
    const [rejectState, rejectAction] = useFormState(rejectPartnerInvite, null);

    if (!invite) return null;

    return (
        <Card className="max-w-md mx-auto">
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
                    Ao aceitar, vocês poderão compartilhar transações, orçamentos e análises no "Modo Casal".
                </p>
            </CardContent>
            <CardFooter className="grid grid-cols-2 gap-4">
                 <form action={rejectAction}>
                    <input type="hidden" name="inviteId" value={invite.inviteId} />
                    <ActionButton variant="reject">
                        <X className="mr-2 h-4 w-4" /> Recusar
                    </ActionButton>
                </form>
                <form action={acceptAction}>
                    <input type="hidden" name="inviteId" value={invite.inviteId} />
                    <ActionButton variant="accept">
                        <UserPlus className="mr-2 h-4 w-4" /> Aceitar
                    </ActionButton>
                </form>
            </CardFooter>
        </Card>
    );
}
