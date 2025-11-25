
'use client';

import { useActionState, useEffect } from 'react';
import { sendPartnerInvite } from './actions';
import { useFormStatus } from 'react-dom';
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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Heart className="mr-2 h-4 w-4" />
      )}
      {pending ? 'Enviando...' : 'Enviar Convite'}
    </Button>
  );
}

export default function InvitePartnerPage() {
  const [state, formAction] = useActionState(sendPartnerInvite, null);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

   useEffect(() => {
    if (state?.error) {
      toast({ variant: 'destructive', title: 'Erro', description: state.error });
    }
    if (state?.success) {
      toast({ title: 'Sucesso!', description: state.success });
      router.push('/dashboard/couple/pending');
    }
  }, [state, toast, router]);


  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4">
        <Card className="w-full max-w-md">
             <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Heart className="h-6 w-6 text-pink-500" />
                    Modo Casal
                </CardTitle>
                <CardDescription>
                    Insira o e-mail do seu parceiro(a). Se ele(a) tiver uma conta, receberá um convite para vincular as finanças.
                </CardDescription>
            </CardHeader>
             <form action={formAction}>
                <CardContent className="space-y-4">
                    <input type="hidden" name="userId" value={user?.uid || ''} />
                    <div className="space-y-2">
                        <Label htmlFor="email">E-mail do parceiro(a)</Label>
                        <Input
                            id="email"
                            required
                            type="email"
                            name="email"
                            placeholder="parceiro@email.com"
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <SubmitButton />
                     {state?.error && (
                        <p className="text-red-500 text-sm">{state.error}</p>
                    )}
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
