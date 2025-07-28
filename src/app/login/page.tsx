
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Loader2, Fingerprint, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { base64UrlToBuffer } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { useAuth } from '../dashboard/layout';

const Logo = () => (
    <div className="p-4 bg-secondary/50 rounded-2xl inline-block shadow-inner">
        <div className="text-3xl font-bold tracking-tight" style={{ textShadow: '1px 1px 2px hsl(var(--muted))' }}>
            <span className="text-foreground">Finance</span>
            <span className="text-primary"> $ </span>
            <span className="text-foreground">Flow</span>
        </div>
    </div>
);

const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
        <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 111.8 512 0 398.2 0 256S111.8 0 244 0c71.2 0 133 28.5 176.9 73.4L345 152.2c-23.7-22.5-59.3-37.1-101-37.1-79.2 0-143.9 65.5-143.9 146.2s64.7 146.2 143.9 146.2c87.3 0 125.9-61.7 130.8-93.1H244v-64.8h243.2c1.3 8.3 1.8 16.9 1.8 25.8z"></path>
    </svg>
);


export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const auth = getAuth(app);
  const { user, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    // If auth state is resolved and we have a user, redirect to dashboard
    if (!isAuthLoading && user) {
        router.replace('/dashboard');
    }
    // Check for remembered email on component mount
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRememberMe(true);
    }
  }, [user, isAuthLoading, router]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
        await signInWithEmailAndPassword(auth, email, password);
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        // The layout's auth listener will handle the redirect
        router.push('/dashboard');
    } catch (error: any) {
        const errorCode = error.code;
        let errorMessage = 'Ocorreu um erro ao fazer login.';
        if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
            errorMessage = 'E-mail ou senha inválidos.';
        }
        toast({
          variant: 'destructive',
          title: 'Login Falhou',
          description: errorMessage,
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleBiometricLogin = async () => {
    setIsBiometricLoading(true);
    try {
        const credentialId = localStorage.getItem('webauthn-credential-id');
        if (!credentialId) {
            toast({
                variant: 'destructive',
                title: 'Impressão Digital não Cadastrada',
                description: 'Por favor, cadastre sua impressão digital nas configurações do perfil primeiro.',
            });
            return;
        }

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const options: PublicKeyCredentialRequestOptions = {
            challenge,
            allowCredentials: [{
                type: 'public-key',
                id: base64UrlToBuffer(credentialId),
            }],
            timeout: 60000,
            userVerification: 'required',
            rpId: window.location.hostname
        };

        const credential = await navigator.credentials.get({ publicKey: options });

        if (credential) {
            // In a real app, this assertion would be sent to the server for verification,
            // which would then sign the user in, triggering onAuthStateChanged.
            // For this simulation, we'll assume success and redirect.
            toast({ title: 'Login Biométrico Bem-Sucedido!' });
            router.push('/dashboard');
        } else {
             throw new Error('Falha ao obter credencial biométrica.');
        }

    } catch (err) {
        const error = err as Error;
        toast({
            variant: 'destructive',
            title: 'Falha no Login Biométrico',
            description: `Não foi possível autenticar. (${error.name})`,
        });
    } finally {
        setIsBiometricLoading(false);
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
        // The layout's auth listener will handle the redirect
        router.push('/dashboard');
    } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Falha no Login com Google',
            description: 'Não foi possível autenticar com o Google. Tente novamente.',
        });
    } finally {
        setIsLoading(false);
    }
  };

  // Show a loading spinner while the auth state is being checked
  if (isAuthLoading || user) {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Logo />
          </div>
          <CardTitle>Bem-vindo de volta!</CardTitle>
          <CardDescription>Insira seus dados para acessar sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'} 
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
             <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Checkbox id="remember-me" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked as boolean)} />
                    <label
                        htmlFor="remember-me"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Lembrar de mim
                    </label>
                </div>
                <Button variant="link" type="button" className="p-0 h-auto text-xs" asChild>
                  <Link href="/forgot-password">Esqueceu a senha?</Link>
                </Button>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>

            <div className="my-4 flex items-center">
                <div className="flex-grow border-t border-muted"></div>
                <span className="mx-2 text-xs text-muted-foreground">OU</span>
                <div className="flex-grow border-t border-muted"></div>
            </div>

            <div className="space-y-2">
                <Button variant="outline" className="w-full" disabled={isLoading || isBiometricLoading} onClick={handleBiometricLogin}>
                    {isBiometricLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Fingerprint className="mr-2 h-4 w-4" />
                    )}
                    Entrar com impressão digital
                </Button>

                <Button variant="outline" className="w-full" disabled={isLoading} onClick={handleGoogleLogin}>
                    <GoogleIcon />
                    Entrar com o Google
                </Button>
            </div>

            <div className="mt-6 text-center text-sm">
              Não tem uma conta?{' '}
              <Button variant="link" type="button" className="p-0 h-auto">
                Cadastre-se
              </Button>
            </div>
        </CardContent>
      </Card>
    </main>
  );
}

    