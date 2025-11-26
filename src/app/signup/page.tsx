
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { initializeUser } from '@/lib/storage';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

const Logo = () => (
    <div className="p-4 inline-block">
        <div className="text-3xl font-bold tracking-tight" style={{ textShadow: '1px 1px 2px hsl(var(--muted))' }}>
            <span className="text-foreground">Finance</span>
            <span className="text-primary"> $ </span>
            <span className="text-foreground">Flow</span>
        </div>
    </div>
);

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const auth = getAuth(app);
  const inviteToken = searchParams.get('inviteToken');

  useEffect(() => {
    async function prefillFromInvite() {
        if (inviteToken) {
            const inviteRef = doc(db, 'invites', inviteToken);
            const inviteSnap = await getDoc(inviteRef);
            if (inviteSnap.exists()) {
                const inviteData = inviteSnap.data();
                if (inviteData.dependentName) setName(inviteData.dependentName);
                if (inviteData.dependentEmail) setEmail(inviteData.dependentEmail);
            } else {
                toast({ variant: 'destructive', title: 'Convite Inválido', description: 'Este link de convite não é válido ou já expirou.' });
                router.push('/signup');
            }
        }
    }
    prefillFromInvite();
  }, [inviteToken, router, toast]);

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
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
      
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
            displayName: name,
        });

        // Initialize user document with basic info
        await initializeUser(userCredential.user);

        // Handle dependent invite if token is present
        if (inviteToken) {
            const inviteRef = doc(db, 'invites', inviteToken);
            const inviteSnap = await getDoc(inviteRef);
            if (inviteSnap.exists() && inviteSnap.data().status === 'pending') {
                const inviteData = inviteSnap.data();
                const inviterUid = inviteData.inviterUid;

                // Update the new user's document to link them as a dependent
                await setDoc(doc(db, 'users', userCredential.user.uid), {
                    isDependent: true,
                    parentUid: inviterUid,
                }, { merge: true });

                // Update the parent's document to add the new dependent
                await setDoc(doc(db, 'users', inviterUid), {
                    dependents: {
                        [userCredential.user.uid]: {
                            name: name,
                            email: email,
                        }
                    }
                }, { merge: true });

                // Mark invite as used
                await setDoc(inviteRef, { status: 'completed' }, { merge: true });
                
                toast({ title: 'Bem-vindo(a)!', description: `Sua conta foi criada e vinculada a ${inviteData.sentByName}.` });

            }
        } else {
             toast({
                title: 'Conta Criada!',
                description: 'Seu cadastro foi realizado com sucesso. Faça o login para continuar.',
            });
        }

        // Store user info in localStorage for all cases
        localStorage.setItem('userName', name);
        localStorage.setItem('userEmail', email);

        router.push('/login');
      } else {
          throw new Error('Não foi possível obter os dados do usuário após o cadastro.');
      }

    } catch (error: any) {
      const errorCode = error.code;
      let errorMessage = 'Ocorreu um erro ao criar a conta.';
      if (errorCode === 'auth/email-already-in-use') {
        errorMessage = 'Este e-mail já está em uso por outra conta.';
      } else if (errorCode === 'auth/invalid-email') {
        errorMessage = 'O formato do e-mail é inválido.';
      }
      toast({
        variant: 'destructive',
        title: 'Falha no Cadastro',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Logo />
          </div>
          <CardTitle>{inviteToken ? 'Complete seu Cadastro' : 'Crie sua conta'}</CardTitle>
          <CardDescription>
            {inviteToken ? 'Você foi convidado! Complete seus dados para começar.' : 'Comece a organizar suas finanças hoje mesmo.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome completo"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!!inviteToken}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!inviteToken}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Pelo menos 6 caracteres"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Ao criar sua conta, você concorda com nossos{' '}
              <Link href="/terms" className="underline hover:text-primary">
                Termos de Uso
              </Link>{' '}
              e{' '}
              <Link href="/privacy" className="underline hover:text-primary">
                Política de Privacidade
              </Link>
              .
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {inviteToken ? 'Finalizar Cadastro e Aceitar Convite' : 'Criar Conta'}
            </Button>
          </form>
          {!inviteToken && (
             <div className="mt-6 text-center">
                <Button variant="ghost" asChild>
                <Link href="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para o login
                </Link>
                </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

    