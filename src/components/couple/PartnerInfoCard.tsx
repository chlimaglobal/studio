
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useCoupleStore } from '@/hooks/use-couple-store';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, Loader2, X } from 'lucide-react';
import { disconnectPartner } from '@/app/dashboard/couple/actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

function DisconnectButton() {
    const { pending } = useFormStatus();
    return (
        <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full" disabled={pending}>
                {pending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <X className="mr-2 h-4 w-4" />
                )}
                Desvincular
            </Button>
        </AlertDialogTrigger>
    )
}

export function PartnerInfoCard() {
    const { partner, coupleLink } = useCoupleStore();
    const [state, formAction] = useFormState(disconnectPartner, null);

    if (!partner || !coupleLink) return null;

    return (
         <AlertDialog>
            <Card className="max-w-md mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Heart className="h-6 w-6 text-pink-500" />
                        Você está vinculado(a)!
                    </CardTitle>
                    <CardDescription>
                        Sua conta está conectada com a do seu parceiro(a).
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={partner.photoURL || ''} />
                        <AvatarFallback>{partner.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold text-lg">{partner.name}</p>
                        <p className="text-sm text-muted-foreground">{partner.email}</p>
                    </div>
                </CardContent>
                <CardFooter>
                    <form action={formAction} className="w-full">
                        <DisconnectButton />
                         <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação irá desvincular sua conta da do seu parceiro(a). Vocês não poderão mais usar o "Modo Casal". Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction type="submit" className="bg-destructive hover:bg-destructive/90">
                                Sim, desvincular
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </form>
                </CardFooter>
            </Card>
        </AlertDialog>
    );
}
