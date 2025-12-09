'use client';

import { Suspense, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { initializeUser } from '@/lib/storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const Logo = () => (
  <div className="p-4 inline-block">
      <div className="text-3xl font-bold tracking-tight" style={{ textShadow: '1px 1px 2px hsl(var(--muted))' }}>
          <span className="text-foreground">Finance</span>
          <span className="text-primary"> $ </span>
          <span className="text-foreground">Flow</span>
      </div>
  </div>
);

// WRAPPER OBRIGATÓRIO COM SUSPENSE
export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Carregando...</div>}>
      <SignUpPageContent />
    </Suspense>
  );
}

// CONTEÚDO REAL DA PÁGINA
function SignUpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('inviteToken');

  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const auth = getAuth(app);

  useEffect(() => {
    async function prefillFromInvite() {
      if (!inviteToken) return;

      const inviteRef = doc(db, 'invites', inviteToken);
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        toast({
          variant: 'destructive',
          title: 'Convite inválido',
          description: 'Este link de convite não é válido ou já expirou.'
        });
        return;
      }

      const data = inviteSnap.data();
      if (data.dependentName) setName(data.dependentName);
      if (data.dependentEmail) setEmail(data.dependentEmail);
    }

    prefillFromInvite();
  }, [inviteToken, toast]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Senha muito curta',
        description: 'A senha precisa ter pelo menos 6 caracteres.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(userCredential.user, { displayName: name });
      await initializeUser(userCredential.user);

      // Se é cadastro pelo convite do parceiro
      if (inviteToken) {
        const inviteRef = doc(db, 'invites', inviteToken);
        const inviteSnap = await getDoc(inviteRef);

        if (inviteSnap.exists()) {
          const inviteData = inviteSnap.data();
          const inviterUid = inviteData.inviterUid;

          // Marca o novo usuário como dependente
          await setDoc(
            doc(db, 'users', userCredential.user.uid),
            {
              isDependent: true,
              parentUid: inviterUid,
            },
            { merge: true }
          );

          // Adiciona dependente ao pai
          await setDoc(
            doc(db, 'users', inviterUid),
            {
              dependents: {
                [userCredential.user.uid]: {
                  name: name,
                  email: email,
                },
              },
            },
            { merge: true }
          );

          // Marca convite como concluído
          await setDoc(inviteRef, { status: 'completed' }, { merge: true });

          toast({
            title: 'Cadastro concluído!',
            description: `Sua conta foi vinculada a ${inviteData.sentByName}.`,
          });
        }
      } else {
        toast({
          title: 'Conta criada!',
          description: 'Faça login para continuar.',
        });
      }

      router.push('/login');
    } catch (error: any) {
      console.error(error);

      let msg = 'Erro ao criar conta.';
      if (error.code === 'auth/email-already-in-use') msg = 'E-mail já em uso.';
      if (error.code === 'auth/invalid-email') msg = 'E-mail inválido.';

      toast({
        variant: 'destructive',
        title: 'Falha no cadastro',
        description: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <Logo />
          <CardTitle>{inviteToken ? 'Complete seu cadastro' : 'Crie sua conta'}</CardTitle>
          <CardDescription>
            {inviteToken
              ? 'Você foi convidado! Complete seus dados para começar.'
              : 'Comece a organizar suas finanças hoje mesmo.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} required onChange={e => setName(e.target.value)} disabled={!!inviteToken} />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                required
                onChange={e => setEmail(e.target.value)}
                disabled={!!inviteToken}
              />
            </div>

            <div className="space-y-2">
              <Label>Senha</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  required
                  onChange={e => setPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {inviteToken ? 'Finalizar e aceitar convite' : 'Criar conta'}
            </Button>
          </form>

          {!inviteToken && (
            <div className="mt-6 text-center">
              <Button variant="ghost" asChild>
                <Link href="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao login
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
