
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import BottomNavBar from '@/components/bottom-nav-bar';
import { AddTransactionFab } from '@/components/add-transaction-fab';
import { useRouter } from 'next/navigation';
import { Loader2, Fingerprint } from 'lucide-react';
import { useAuth } from '@/components/client-providers'; 
import { base64UrlToBuffer } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

// App Lock Screen Component
const AppLockScreen = ({ onUnlock }: { onUnlock: () => void }) => {
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleBiometricUnlock = useCallback(async () => {
        setIsAuthenticating(true);
        try {
            const credentialId = localStorage.getItem('webauthn-credential-id');
            if (!credentialId) {
                toast({
                    variant: 'destructive',
                    title: 'Biometria não cadastrada',
                    description: 'Ative a biometria nas configurações para usar o bloqueio de tela.',
                });
                onUnlock(); // Unlock to let user fix settings
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
                onUnlock();
            } else {
                throw new Error('Falha na autenticação biométrica.');
            }
        } catch (err) {
            const error = err as Error;
            // Don't show toast for user cancellation
            if (error.name !== 'NotAllowedError') {
                 toast({
                    variant: 'destructive',
                    title: 'Falha na Autenticação',
                    description: `Não foi possível autenticar. (${error.name})`,
                });
            }
            // If it fails, they are stuck. Maybe offer a way out?
            // For now, they can just reload.
        } finally {
            setIsAuthenticating(false);
        }
    }, [onUnlock, toast]);

    useEffect(() => {
        // Automatically trigger unlock prompt when component mounts
        handleBiometricUnlock();
    }, [handleBiometricUnlock]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
            <div className="text-center space-y-6">
                 <div className="p-4 bg-primary/10 rounded-full inline-block">
                    <Fingerprint className="h-12 w-12 text-primary" />
                 </div>
                <h1 className="text-2xl font-bold">FinanceFlow Bloqueado</h1>
                <p className="text-muted-foreground">Use sua impressão digital para desbloquear.</p>
                <Button onClick={handleBiometricUnlock} disabled={isAuthenticating}>
                    {isAuthenticating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Tentar Novamente
                </Button>
            </div>
        </div>
    );
};


// Main Layout Component
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, user } = useAuth();
  const router = useRouter();
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    // If auth is done loading and there's no user, redirect to login
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    const isAppLockEnabled = localStorage.getItem('appLockEnabled') === 'true';
    const isBiometricRegistered = !!localStorage.getItem('webauthn-credential-id');
    
    if (!isLoading && user && isAppLockEnabled && isBiometricRegistered) {
      // Check if session exists to avoid locking on first login
      const sessionActive = sessionStorage.getItem('app-session-active');
      if (!sessionActive) {
        setIsLocked(true);
      }
    }
     // Mark session as active after the first check
    sessionStorage.setItem('app-session-active', 'true');
  }, [isLoading, user]);


  const handleUnlock = () => {
    setIsLocked(false);
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Carregando...</p>
      </div>
    );
  }
  
  if (isLocked) {
    return <AppLockScreen onUnlock={handleUnlock} />;
  }

  return (
      <div className="flex flex-col min-h-screen w-full bg-background">
        <main className="flex-1 overflow-y-auto pb-28 p-4">
          {children}
        </main>
        <AddTransactionFab />
        <BottomNavBar />
      </div>
  );
}
