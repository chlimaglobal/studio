
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Loader2, Fingerprint } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { base64UrlToBuffer } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';

const Logo = () => (
    <div className="text-4xl font-bold tracking-tighter">
        <span className="text-primary">F</span>
        <span className="text-foreground">$</span>
        <span className="text-primary">F</span>
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
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRememberMe(true);
    }
  }, []);

  const handleLogin = (event?: React.FormEvent) => {
    event?.preventDefault();
    setIsLoading(true);

    // Simulate API call and validation
    setTimeout(() => {
      const storedPassword = localStorage.getItem('userPassword') || 'password123';
      if (email === 'user@example.com' && password === storedPassword) {
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        router.push('/dashboard');
      } else {
        toast({
          variant: 'destructive',
          title: 'Login Falhou',
          description: 'E-mail ou senha inválidos.',
        });
        setIsLoading(false);
      }
    }, 1000);
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
            setIsBiometricLoading(false);
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
            // In a real app, send this to the server for verification
            console.log('Login com WebAuthn bem-sucedido!', credential);
            toast({
                title: 'Login Bem-Sucedido!',
                description: 'Bem-vindo de volta!',
            });
            router.push('/dashboard');
        } else {
             throw new Error('Falha ao obter credencial.');
        }

    } catch (err) {
        console.error("Erro no login biométrico:", err);
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

  const handleGoogleLogin = () => {
    setIsLoading(true);
    // Simulate Google OAuth flow
    setTimeout(() => {
        toast({
            title: 'Login com Google bem-sucedido!',
            description: 'Bem-vindo(a) ao FinanceFlow.',
        });
        // In a real app, you'd get user info from Google and set it.
        // For now, we can set some defaults.
        localStorage.setItem('userName', 'Usuário Google');
        localStorage.setItem('userEmail', 'google.user@example.com');
        router.push('/dashboard');
    }, 1000);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
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
