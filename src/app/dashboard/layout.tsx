
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import BottomNavBar from '@/components/bottom-nav-bar';
import { AddTransactionFab } from '@/components/add-transaction-fab';
import { useRouter } from 'next/navigation';
import { Loader2, Fingerprint } from 'lucide-react';
import { useAuth } from '@/components/providers/client-providers'; 
import { base64UrlToBuffer } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import NewsTicker from '@/components/news-ticker';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser } from '@/types';
import DashboardHeader from '@/components/dashboard-header';
import { ClientProviders } from '@/components/providers/client-providers';


const UNLOCK_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

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
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth(); // No longer provides isLoading
  const router = useRouter();
  const [isLocked, setIsLocked] = useState(false);
  const [isDependent, setIsDependent] = useState<boolean | null>(null);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Internal loading state for this layout

  useEffect(() => {
    const storedPrivacyMode = localStorage.getItem('privacyMode') === 'true';
    setIsPrivacyMode(storedPrivacyMode);
  }, []);

  const handleTogglePrivacyMode = () => {
    const newMode = !isPrivacyMode;
    setIsPrivacyMode(newMode);
    localStorage.setItem('privacyMode', String(newMode));
  };


  useEffect(() => {
    if (user === undefined) return; // Wait for auth state to be determined

    if (user === null) {
      router.replace('/login');
      return;
    }
    
    async function checkUserRole() {
        if (user) {
            const userDocRef = doc(db, 'users', user.uid);
            try {
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                    const userData = docSnap.data() as AppUser;
                    if (userData.isDependent) {
                        setIsDependent(true);
                        router.replace('/dashboard/dependent');
                    } else {
                        setIsDependent(false);
                    }
                } else {
                    setIsDependent(false);
                }
            } catch (error) {
                 console.error("Error checking user role:", error);
                 setIsDependent(false); // Default to not dependent on error
            }
        }
        setIsLoading(false); // Auth check and role check is done
    }
    checkUserRole();
  }, [user, router]);

  useEffect(() => {
    const isAppLockEnabled = localStorage.getItem('appLockEnabled') === 'true';
    const isBiometricRegistered = !!localStorage.getItem('webauthn-credential-id');
    
    if (!isLoading && user && isAppLockEnabled && isBiometricRegistered) {
      const lastUnlockTimestamp = sessionStorage.getItem('app-last-unlocked');
      const now = Date.now();
      
      if (!lastUnlockTimestamp || (now - parseInt(lastUnlockTimestamp, 10) > UNLOCK_TIMEOUT_MS)) {
        setIsLocked(true);
      }
    }
  }, [isLoading, user]);


  const handleUnlock = () => {
    sessionStorage.setItem('app-last-unlocked', Date.now().toString());
    setIsLocked(false);
  };

  if (isLoading || isDependent === null) {
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

  // The ClientProviders now wraps the content here, ensuring context is available to all children.
  return (
    <ClientProviders>
        <div className="flex flex-col min-h-screen w-full bg-background">
        <DashboardHeader isPrivacyMode={isPrivacyMode} onTogglePrivacyMode={handleTogglePrivacyMode} />
        <main className="flex-1 overflow-y-auto pb-40 p-4">
            {children}
        </main>
        {!isDependent && <AddTransactionFab />}
        <div className="fixed bottom-20 left-0 w-full z-40">
            {!isDependent && <NewsTicker />}
        </div>
        <BottomNavBar />
        </div>
    </ClientProviders>
  );
}
