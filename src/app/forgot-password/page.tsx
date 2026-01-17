
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { app } from '@/lib/firebase';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const handlePasswordRecovery = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    const auth = getAuth(app);

    try {
      await sendPasswordResetEmail(auth, email);

      toast({
        title: 'Link enviado!',
        description: 'Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.',
      });
      
      // We don't redirect automatically to allow the user to read the success message.
      // The user will click the link in their email.
      // router.push('/reset-password'); // This might not be desirable UX

    } catch (error: any) {
      console.error('[AUTH ERROR]', {
        code: error.code,
        message: error.message,
        stack: error.stack,
      });

      let message = 'Erro ao enviar link. Tente novamente.';
      switch (error.code) {
        case 'auth/invalid-email':
          message = 'O e-mail informado é inválido.';
          break;
        case 'auth/user-not-found':
          // For security, don't reveal if a user exists. The success message already does this.
          message = 'Se este e-mail estiver cadastrado, você receberá um link em breve.';
          break;
        case 'auth/too-many-requests':
          message = 'Muitas tentativas. Por favor, tente novamente em alguns minutos.';
          break;
        case 'auth/network-request-failed':
          message = 'Falha de rede. Verifique sua conexão com a internet.';
          break;
      }
      
      // In the case of user-not-found, we show a success-like toast to prevent user enumeration.
      if (error.code === 'auth/user-not-found') {
          toast({
            title: 'Verifique seu e-mail',
            description: message,
        });
      } else {
         toast({
            title: 'Atenção',
            description: message,
            variant: 'destructive',
        });
      }
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Esqueceu sua senha?</CardTitle>
          <CardDescription>
            Sem problemas. Digite seu e-mail e enviaremos um link para redefinir sua senha.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handlePasswordRecovery} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar link de recuperação
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button variant="ghost" asChild>
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para o login
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
