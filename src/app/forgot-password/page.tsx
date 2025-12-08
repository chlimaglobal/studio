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

// 🔥 Firebase
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { app } from '@/lib/firebase'; // garante que está usando sua instância correta

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

      setIsLoading(false);

      // Mantemos o redirecionamento para consistência da simulação
      router.push('/reset-password');

    } catch (error: any) {
      setIsLoading(false);

      let message = 'Erro ao enviar link. Tente novamente.';

      // Tratamento mais humano e profissional
      if (error.code === 'auth/invalid-email') {
        message = 'O e-mail informado é inválido.';
      }
      if (error.code === 'auth/user-not-found') {
        message = 'Nenhuma conta encontrada com este e-mail.';
      }
      if (error.code === 'auth/too-many-requests') {
        message = 'Muitas tentativas. Tente novamente em alguns minutos.';
      }

      toast({
        title: 'Atenção',
        description: message,
        variant: 'destructive',
      });
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
