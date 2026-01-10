
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Moon, Palette, Sun, Smartphone, Bell, DollarSign, Music, Play, UserCircle, Fingerprint, Loader2, CheckCircle, Target, CreditCard, AlertCircle, Sparkles, Droplets, Check, Camera, MessageCircle, ArrowLeft, BellRing, Download, Laptop, Star, Home } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { bufferToBase64Url, cn, base64UrlToBuffer } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/app-providers';
import { getAllUserDataForBackup, saveFcmToken } from '@/lib/storage';
import Link from 'next/link';
import { messaging } from '@/lib/firebase';
import { getToken } from 'firebase/messaging';
import type { NotificationSettings } from '@/types';


const incomeSounds = [
    { value: 'cash-register.mp3', label: 'Caixa Registradora' },
    { value: 'none', label: 'Nenhum' },
];

const expenseSounds = [
    { value: 'swoosh.mp3', label: 'Swoosh' },
    { value: 'none', label: 'Nenhum' },
];

const NotificationSwitch = ({ id, label, checked, onCheckedChange, disabled = false }: { id: keyof NotificationSettings, label: string, checked: boolean, onCheckedChange: (id: keyof NotificationSettings, value: boolean) => void, disabled?: boolean }) => (
    <div className="flex items-center justify-between py-3">
        <Label htmlFor={id} className={cn("flex items-center gap-3 font-normal", disabled && "cursor-not-allowed opacity-50")}>
            <CheckCircle className={cn('h-6 w-6 transition-colors', checked ? 'text-primary' : 'text-muted-foreground/50')} />
            {label}
        </Label>
        <Switch
            id={id}
            checked={checked}
            onCheckedChange={(value) => onCheckedChange(id, value)}
            disabled={disabled}
        />
    </div>
);

const ThemeSelector = () => {
    const { theme, setTheme } = useTheme();

    const themes = [
        { name: 'light', label: 'Claro', icon: Sun, gradient: 'from-sky-300 to-white' },
        { name: 'dark', label: 'Escuro', icon: Moon, gradient: 'from-slate-800 to-slate-900' },
        { name: 'gold', label: 'Dourado', icon: Sparkles, gradient: 'from-yellow-600 to-amber-800' },
        { name: 'system', label: 'Padrão do Sistema', icon: Laptop, gradient: 'from-slate-400 to-slate-600' },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Temas</CardTitle>
                <CardDescription>Escolha um tema de sua preferência para deixar o app com o seu estilo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {themes.map((t) => (
                         <button
                            key={t.name}
                            onClick={() => setTheme(t.name)}
                            className={cn(
                                'w-full rounded-lg p-4 text-left relative overflow-hidden transition-all duration-300',
                                theme === t.name && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                            )}
                        >
                            <div className={cn('absolute inset-0 bg-gradient-to-r', t.gradient)}></div>
                            <div className="relative z-10 flex items-center justify-between">
                                 <span className={cn('font-semibold flex items-center gap-2', (t.name === 'light') ? 'text-black' : 'text-white')}>
                                    <t.icon className="h-5 w-5" />
                                    {t.label}
                                 </span>
                                {theme === t.name && (
                                     <div className={cn('w-6 h-6 rounded-full flex items-center justify-center', (t.name === 'light') ? 'bg-black/20 text-white' : 'bg-white/30 text-white')}>
                                        <Check className="w-4 w-4" />
                                    </div>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};


export default function SettingsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userWhatsApp, setUserWhatsApp] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [incomeSound, setIncomeSound] = useState('cash-register.mp3');
  const [expenseSound, setExpenseSound] = useState('swoosh.mp3');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isAppLockEnabled, setIsAppLockEnabled] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [isExporting, setIsExporting] = useState(false);
  const [isActivatingNotifications, setIsActivatingNotifications] = useState(false);


  const [notifications, setNotifications] = useState<NotificationSettings>({
    dailySummary: true,
    futureIncome: true,
    futurePayments: true,
    sync: true,
    promos: true,
    goalsMet: true,
    spendingLimits: true,
    goalReminders: true,
    spendingReminders: true,
    invoiceDue: true,
    invoiceClosed: true,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window === 'undefined') return;
    
    // Function to check and update notification status
    const checkNotificationStatus = () => {
        if ('Notification' in window) {
            setNotificationStatus(Notification.permission);
        } else {
            setNotificationStatus('unsupported');
        }
    };
    checkNotificationStatus(); // Initial check

    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(supported => {
            setIsBiometricSupported(supported);
        });
    }

    setUserName(localStorage.getItem('userName') || '');
    setUserEmail(localStorage.getItem('userEmail') || '');
    setUserWhatsApp(localStorage.getItem('userWhatsApp') || '');
    setProfilePic(localStorage.getItem('profilePic'));
    setIncomeSound(localStorage.getItem('incomeSound') || 'cash-register.mp3');
    setExpenseSound(localStorage.getItem('expenseSound') || 'swoosh.mp3');
    setIsAppLockEnabled(localStorage.getItem('appLockEnabled') === 'true');
    
    const storedNotifications = localStorage.getItem('notificationSettings');
    if (storedNotifications) {
      setNotifications(JSON.parse(storedNotifications));
    }

  }, []);
  
  const handleAppLockToggle = async (enabled: boolean) => {
    setIsAppLockEnabled(enabled);

    if (!enabled) {
        localStorage.removeItem('appLockEnabled');
        toast({
            title: 'Bloqueio de Tela Desativado',
            description: 'O aplicativo não pedirá mais a biometria ao ser aberto.',
        });
        return;
    }

    // If enabling, check if biometrics are registered first
    const isRegistered = !!localStorage.getItem('webauthn-credential-id');
    if (!isRegistered) {
        setIsRegistering(true);
        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);
            let userId = localStorage.getItem('webauthn-user-id');
            if (!userId) {
                const newUserId = new Uint8Array(16);
                window.crypto.getRandomValues(newUserId);
                userId = bufferToBase64Url(newUserId);
                localStorage.setItem('webauthn-user-id', userId);
            }

            const options: PublicKeyCredentialCreationOptions = {
                challenge,
                rp: { name: "FinanceFlow App", id: window.location.hostname },
                user: {
                    id: Uint8Array.from(atob(userId.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
                    name: userEmail,
                    displayName: userName,
                },
                pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
                authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", requireResidentKey: true },
                timeout: 60000,
                attestation: "direct",
            };

            const credential = await navigator.credentials.create({ publicKey: options });
            
            if (credential && (credential as PublicKeyCredential).rawId) {
                localStorage.setItem('webauthn-credential-id', bufferToBase64Url((credential as PublicKeyCredential).rawId));
                localStorage.setItem('appLockEnabled', 'true');
                toast({ title: 'Biometria e Bloqueio Ativados!', description: 'Sua impressão digital foi cadastrada e o bloqueio de tela está ativo.' });
            } else {
                 setIsAppLockEnabled(false); // Revert switch if credential fails
            }

        } catch (err) {
            console.error("Erro no cadastro biométrico:", err);
            const error = err as Error;
            toast({ variant: 'destructive', title: 'Falha no Cadastro Biométrico', description: `Não foi possível cadastrar a biometria. O bloqueio não foi ativado. (${error.name})` });
            setIsAppLockEnabled(false); // Revert switch on failure
        } finally {
            setIsRegistering(false);
        }
    } else {
        // Biometrics already registered, just enable the lock
        localStorage.setItem('appLockEnabled', 'true');
        toast({ title: 'Bloqueio de Tela Ativado!', description: 'O aplicativo pedirá sua biometria ao ser aberto.' });
    }
  }


  const handleNotificationChange = (id: keyof NotificationSettings, value: boolean) => {
    setNotifications(prev => ({ ...prev, [id]: value }));
  };
  
  const playPreviewSound = (soundFile: string) => {
    if (!soundFile || soundFile === 'none' || typeof window === 'undefined') return;
    
    try {
      const audio = new Audio(`/${soundFile}`);
      const playPromise = audio.play();

      if (playPromise !== undefined) {
          playPromise.catch(error => {
              console.error("Audio playback error:", error);
              toast({
                  variant: 'destructive',
                  title: 'Erro ao Tocar Som',
                  description: 'Não foi possível reproduzir o áudio.',
              });
          });
      }
    } catch (e) {
        console.error("Failed to create or play audio:", e)
    }
  };


  const handleSave = () => {
    localStorage.setItem('userName', userName);
    localStorage.setItem('userEmail', userEmail);
    localStorage.setItem('userWhatsApp', userWhatsApp);
    localStorage.setItem('incomeSound', incomeSound);
    localStorage.setItem('expenseSound', expenseSound);
    localStorage.setItem('notificationSettings', JSON.stringify(notifications));
    
    window.dispatchEvent(new Event('storage'));

    toast({
      title: 'Configurações Salvas!',
      description: 'Suas preferências foram atualizadas com sucesso.',
    });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setProfilePic(base64String);
        localStorage.setItem('profilePic', base64String);
        window.dispatchEvent(new Event('storage'));
        toast({
          title: 'Foto de perfil atualizada!',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const performBackup = async () => {
    if (!user) return;
    setIsExporting(true);
    toast({ title: 'Preparando seu backup...', description: 'Estamos coletando todos os seus dados. Isso pode levar um momento.' });

    try {
      const userData = await getAllUserDataForBackup(user.uid);
      
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(userData, null, 2))}`;
      const link = document.createElement('a');
      link.href = jsonString;
      link.download = 'backup-finance-flow.json';
      link.click();

      toast({
        title: 'Backup Concluído!',
        description: 'Seu arquivo de backup foi baixado com sucesso.',
      });

    } catch (error) {
      console.error("Failed to export data:", error);
      toast({
        variant: 'destructive',
        title: 'Erro no Backup',
        description: `Não foi possível gerar seu backup. Tente novamente mais tarde.`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportData = async () => {
    const credentialId = localStorage.getItem('webauthn-credential-id');
    if (!isBiometricSupported || !credentialId) {
        // If biometrics are not supported or not registered, proceed without it.
        await performBackup();
        return;
    }
    
    try {
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
             toast({ title: 'Identidade confirmada!', description: 'Gerando seu backup seguro.' });
             await performBackup();
        } else {
            throw new Error('Falha na autenticação biométrica para o backup.');
        }

    } catch (err) {
        const error = err as Error;
        if (error.name !== 'NotAllowedError') {
             toast({
                variant: 'destructive',
                title: 'Falha na Autenticação',
                description: `Não foi possível verificar sua identidade para o backup. (${error.name})`,
            });
        }
    }
  };

  const handleRequestPermission = async () => {
    if (notificationStatus === 'granted' || typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }
  
    setIsActivatingNotifications(true);
    try {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);
  
      if (permission === 'granted') {
        toast({
          title: 'Notificações Ativadas!',
          description: 'Você receberá os alertas do sistema.',
        });
  
        // Get FCM Token and save it
        const fcm = await messaging();
        if (fcm && user) {
          const fcmToken = await getToken(fcm, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
          if (fcmToken) {
            await saveFcmToken(user.uid, fcmToken);
          }
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Notificações Bloqueadas',
          description: 'Você pode precisar ativá-las manualmente nas configurações do seu navegador.',
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
       toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível solicitar a permissão para notificações.',
        });
    } finally {
        setIsActivatingNotifications(false);
    }
  };

  if (!isMounted) {
    return null; 
  }

  const renderNotificationStatus = () => {
    switch(notificationStatus) {
        case 'granted':
            return <span className="text-sm font-medium text-primary flex items-center gap-1.5"><CheckCircle className="h-4 w-4" />Ativado</span>;
        case 'denied':
            return <span className="text-sm font-medium text-destructive">Bloqueado no navegador</span>;
        default:
            return <span className="text-sm text-muted-foreground">Não solicitado</span>
    }
  };


  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">Configurações</h1>
              <p className="text-muted-foreground">Gerencie as preferências do aplicativo e da sua conta.</p>
            </div>
        </div>
        <Button onClick={handleSave}>Salvar Alterações</Button>
      </div>

       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserCircle className="h-5 w-5" /> Meu Perfil</CardTitle>
          <CardDescription>Edite seus dados pessoais e foto.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
                <div className="relative">
                    <Avatar className="h-20 w-20 cursor-pointer" onClick={handleAvatarClick}>
                        <AvatarImage src={profilePic ?? undefined} alt="User Avatar" />
                        <AvatarFallback className="text-3xl">
                            {userName ? userName.charAt(0).toUpperCase() : 'U'}
                        </AvatarFallback>
                    </Avatar>
                    <div 
                        className="absolute bottom-0 right-0 h-7 w-7 bg-primary rounded-full flex items-center justify-center text-primary-foreground cursor-pointer"
                        onClick={handleAvatarClick}
                    >
                        <Camera className="h-4 w-4" />
                    </div>
                    <Input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/png, image/jpeg"
                        onChange={handleProfilePicChange}
                    />
                </div>
                <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <Label htmlFor="user-name">Nome Completo</Label>
                        <Input 
                            id="user-name" 
                            type="text" 
                            placeholder="Seu nome" 
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label htmlFor="user-email">Email</Label>
                        <Input 
                            id="user-email" 
                            type="email" 
                            placeholder="seu@email.com" 
                            value={userEmail}
                            onChange={(e) => setUserEmail(e.target.value)}
                        />
                    </div>
                </div>
            </div>
            <div>
              <Label htmlFor="user-whatsapp">Número do WhatsApp</Label>
              <Input 
                  id="user-whatsapp" 
                  type="tel" 
                  placeholder="ex: 5511999998888" 
                  value={userWhatsApp}
                  onChange={(e) => setUserWhatsApp(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Inclua o código do país (ex: 55 para Brasil).</p>
          </div>
        </CardContent>
      </Card>
      
      
       <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Fingerprint className="h-5 w-5" /> Segurança</CardTitle>
            <CardDescription>Aumente a segurança do seu aplicativo.</CardDescription>
        </CardHeader>
        <CardContent>
            {isBiometricSupported ? (
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <Label htmlFor="app-lock" className="font-semibold">Bloqueio de Tela por Biometria</Label>
                        <p className="text-sm text-muted-foreground">Exigir impressão digital ao abrir o aplicativo.</p>
                    </div>
                    {isRegistering ? <Loader2 className="h-5 w-5 animate-spin" /> : <Switch id="app-lock" checked={isAppLockEnabled} onCheckedChange={handleAppLockToggle} />}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">O bloqueio por biometria não é suportado neste dispositivo ou navegador.</p>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Backup e Exportação</CardTitle>
          <CardDescription>
            Exporte todos os seus dados para um arquivo JSON como medida de segurança ou para migração. Ações críticas como esta exigem autenticação biométrica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExportData} disabled={isExporting} className="w-full">
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {isExporting ? 'Gerando Backup...' : 'Fazer Backup Agora'}
          </Button>
        </CardContent>
      </Card>
      
      <ThemeSelector />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notificações</CardTitle>
          <CardDescription>Escolha os tipos de notificações que deseja receber durante seu dia a dia no app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground flex items-center gap-2"><Smartphone className="h-4 w-4" /> Alertas do Sistema</h3>
              <div className="flex items-center justify-between rounded-md border bg-background p-4">
                <div>
                    <p className="font-medium">Notificações Push</p>
                    <p className="text-sm text-muted-foreground">Receba alertas diretamente no seu dispositivo.</p>
                     {notificationStatus === 'denied' && (
                        <p className="text-xs text-destructive mt-1">
                            Você bloqueou as notificações. Para reativar, acesse as configurações do seu navegador para este site.
                        </p>
                    )}
                </div>
                {renderNotificationStatus()}
              </div>
              {notificationStatus === 'default' && (
                 <Button 
                    variant="outline"
                    className="w-full mt-3" 
                    onClick={handleRequestPermission}
                    disabled={isActivatingNotifications}
                 >
                    {isActivatingNotifications ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BellRing className="h-4 w-4 mr-2" />}
                    Ativar Notificações neste Dispositivo
                </Button>
              )}
            </div>

            <div className="space-y-2">
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground flex items-center gap-2"><Sparkles className="h-4 w-4" /> Alertas no App</h3>
                <div className="divide-y divide-border rounded-lg border bg-background p-4">
                    <NotificationSwitch id="dailySummary" label="Resumo do dia anterior" checked={notifications.dailySummary} onCheckedChange={handleNotificationChange} />
                    <NotificationSwitch id="futureIncome" label="Recebimentos futuros" checked={notifications.futureIncome} onCheckedChange={handleNotificationChange} />
                    <NotificationSwitch id="futurePayments" label="Pagamentos futuros" checked={notifications.futurePayments} onCheckedChange={handleNotificationChange} />
                </div>
            </div>

            <div className="pt-4">
                <Label className="flex items-center gap-2 font-semibold text-muted-foreground"><Music className="h-4 w-4" /> Sons de Notificação</Label>
                <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="income-sound">Som de Receita</Label>
                      <div className="flex items-center gap-2">
                        <Select value={incomeSound} onValueChange={setIncomeSound}>
                            <SelectTrigger id="income-sound">
                            <SelectValue placeholder="Selecione um som" />
                            </SelectTrigger>
                            <SelectContent>
                            {incomeSounds.map(sound => (
                                <SelectItem key={sound.value} value={sound.value}>{sound.label}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={() => playPreviewSound(incomeSound)}>
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="expense-sound">Som de Despesa</Label>
                      <div className="flex items-center gap-2">
                        <Select value={expenseSound} onValueChange={setExpenseSound}>
                            <SelectTrigger id="expense-sound">
                            <SelectValue placeholder="Selecione um som" />
                            </SelectTrigger>
                            <SelectContent>
                            {expenseSounds.map(sound => (
                                <SelectItem key={sound.value} value={sound.value}>{sound.label}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={() => playPreviewSound(expenseSound)}>
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
