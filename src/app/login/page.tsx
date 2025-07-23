
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

const LogoIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 20V14.5C4 13.0667 4.58333 11.8333 5.75 10.8C6.91667 9.76667 8.33333 9.25 10 9.25C11.6667 9.25 13.0833 9.76667 14.25 10.8C15.4167 11.8333 16 13.0667 16 14.5V20H11V14.5C11 14.0333 10.85 13.65 10.55 13.35C10.25 13.05 9.86667 12.9 9.4 12.9C8.93333 12.9 8.55 13.05 8.25 13.35C7.95 13.65 7.8 14.0333 7.8 14.5V20H4ZM12 8L15.3 4H19.5L14 9.5L18 13V15.5L12 8Z" fill="hsl(var(--primary))"/>
    </svg>
);


export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogin = (event?: React.FormEvent) => {
    event?.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      router.push('/dashboard');
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

  if (!isMounted) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <LogoIcon />
          </div>
          <CardTitle>Bem-vindo de volta!</CardTitle>
          <CardDescription>Insira seus dados para acessar sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="seu@email.com" required defaultValue="marcos.lima@example.com" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Button variant="link" type="button" className="p-0 h-auto text-xs">
                  Esqueceu a senha?
                </Button>
              </div>
              <Input id="password" type="password" required defaultValue="password123" />
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

            <Button variant="outline" className="w-full" disabled={isLoading || isBiometricLoading} onClick={handleBiometricLogin}>
                {isBiometricLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Fingerprint className="mr-2 h-4 w-4" />
                )}
                Entrar com impressão digital
            </Button>

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
