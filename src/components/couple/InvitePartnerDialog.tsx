'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../client-providers';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { app } from '@/lib/firebase';
import { useCoupleStore } from '@/hooks/use-couple-store';
import { useRouter } from 'next/navigation';

interface InvitePartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvitePartnerDialog({ open, onOpenChange }: InvitePartnerDialogProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Você precisa estar logado.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const functions = getFunctions(app);
      const sendInviteCallable = httpsCallable(functions, 'sendPartnerInvite');

      const result = await sendInviteCallable({
        partnerEmail: email,
        senderName: user.displayName || 'Usuário',
      });

      const data = result.data as {
        success: boolean;
        message: string;
        error?: string;
      };

      if (data.success) {
        toast({
          title: 'Sucesso!',
          description: data.message,
        });

        onOpenChange(false);
        setEmail('');
      } else {
        throw new Error(data.error || 'Ocorreu um erro desconhecido.');
      }

    } catch (error: any) {

      toast({
        variant: 'destructive',
        title: 'Erro ao Enviar Convite',
        description:
          error.message ||
          'Não foi possível enviar o convite. Verifique se o usuário com este e-mail já existe.',
      });
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Convidar Parceiro(a)</DialogTitle>
          <DialogDescription>
            Insira o e-mail do seu parceiro(a). Ele(a) precisa ter uma conta no FinanceFlow para que o convite funcione.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleInvite}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                E-mail
              </Label>

              <Input
                id="email"
                name="email"
                type="email"
                placeholder="parceiro@email.com"
                className="col-span-3"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar Convite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
