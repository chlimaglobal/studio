'use client';

import { useCoupleStore } from '@/hooks/use-couple-store';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, Heart, UserX } from 'lucide-react';
import { useAuth } from '../client-providers';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

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
} from '@/components/ui/alert-dialog';

export function PartnerInfoCard() {
  const { user } = useAuth();
  const { partner } = useCoupleStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleDisconnect = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      const disconnectPartnerCallable = httpsCallable(functions, 'disconnectPartner');
      const result = await disconnectPartnerCallable();
      const data = result.data as { success: boolean; message?: string; error?: string };

      if (data.success) {
        toast({
          title: 'Sucesso!',
          description: data.message || 'Vocês foram desvinculados.',
        });
      } else {
        throw new Error(data.error || 'Erro desconhecido.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Desvincular',
        description:
          error.message ||
          'Não foi possível desvincular seu parceiro(a). Tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!partner) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Carregando dados do parceiro...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="text-pink-500" />
          Modo Casal Ativo
        </CardTitle>
        <CardDescription>
          Você está conectado(a) com seu parceiro(a).
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-border">
            <AvatarImage src={user?.photoURL || undefined} />
            <AvatarFallback className="text-xl">
              {user?.displayName?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <Heart className="h-6 w-6 text-muted-foreground" />

          <Avatar className="h-16 w-16 border-2 border-border">
            <AvatarImage src={partner.photoURL || undefined} />
            <AvatarFallback className="text-xl">
              {partner.displayName?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        <p className="font-semibold">
          {user?.displayName} & {partner.displayName}
        </p>
      </CardContent>

      <CardFooter>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="w-full"
              disabled={isLoading}
            >
              <UserX className="mr-2 h-4 w-4" /> Desvincular
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desvincular Parceiro(a)?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação removerá o acesso compartilhado. Suas transações
                permanecerão separadas. Você poderá se conectar novamente no
                futuro.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>

              <AlertDialogAction
                onClick={handleDisconnect}
                disabled={isLoading}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Sim, desvincular
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
