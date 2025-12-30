
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/client-providers';
import { useRouter } from 'next/navigation';

import { httpsCallable, getFunctions } from 'firebase/functions';
import { app } from '@/lib/firebase';

export default function InvitePartnerPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      const functions = getFunctions(app, 'us-central1');
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

        router.push('/dashboard/couple/pending');
      } else {
        throw new Error(data.error || 'Erro desconhecido.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Enviar Convite',
        description:
          error.message ||
          'Não foi possível enviar o convite. Verifique se o e-mail existe e pertence a um usuário.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-pink-500" />
            Modo Casal
          </CardTitle>
          <CardDescription>
            Insira o e-mail do seu parceiro(a). Ele(a) precisa ter uma conta no FinanceFlow.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleInvite}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail do parceiro(a)</Label>
              <Input
                id="email"
                required
                type="email"
                placeholder="parceiro@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Heart className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Enviando...' : 'Enviar Convite'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Button variant="link" onClick={() => router.back()} className="mt-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>
    </div>
  );
}
