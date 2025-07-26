
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Moon, Palette, Sun, Smartphone, Bell, WalletCards, DollarSign, Music, Play, UserCircle, Fingerprint, Loader2, CheckCircle, Target, CreditCard, AlertCircle, Sparkles, Droplets, Check, Camera, MessageCircle, ArrowLeft, BellRing } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { bufferToBase64Url } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';


type FabPosition = 'left' | 'right';
type NotificationSettings = {
  dailySummary: boolean;
  futureIncome: boolean;
  futurePayments: boolean;
  sync: boolean;
  promos: boolean;
  goalsMet: boolean;
  spendingLimits: boolean;
  goalReminders: boolean;
  spendingReminders: boolean;
  invoiceDue: boolean;
  invoiceClosed: boolean;
};


const incomeSounds = [
    { value: 'cash-register.mp3', label: 'Caixa Registradora' },
    { value: 'coin.mp3', label: 'Moeda' },
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
        { name: 'light', label: 'Claro', gradient: 'from-blue-400 to-white' },
        { name: 'dark', label: 'Escuro', gradient: 'from-gray-700 to-gray-900' },
        { name: 'gold', label: 'Dourado', gradient: 'from-yellow-600 to-amber-800' },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Temas</CardTitle>
                <CardDescription>Escolha um tema de sua preferência para deixar o app com o seu estilo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
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
                                 <span className={cn('font-semibold', (t.name === 'light') ? 'text-black' : 'text-white')}>
                                    {t.label}
                                </span>
                                {theme === t.name && (
                                     <div className={cn('w-6 h-6 rounded-full flex items-center justify-center', (t.name === 'light') ? 'bg-black/20 text-white' : 'bg-white/30 text-white')}>
                                        <Check className="w-4 h-4" />
                                    </div>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
                 <Button variant="link" className="p-0 text-sm h-auto text-muted-foreground">
                    Tem alguma sugestão de tema? Toque aqui para nos sugerir.
                </Button>
            </CardContent>
        </Card>
    );
};


export default function SettingsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userWhatsApp, setUserWhatsApp] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [payday, setPayday] = useState('');
  const [incomeSound, setIncomeSound] = useState('cash-register.mp3');
  const [expenseSound, setExpenseSound] = useState('swoosh.mp3');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricRegistered, setIsBiometricRegistered] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

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
    
    const checkNotificationPermission = () => {
      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
    };
    checkNotificationPermission();

    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(supported => {
            setIsBiometricSupported(supported);
        });
    }

    setUserName(localStorage.getItem('userName') || '');
    setUserEmail(localStorage.getItem('userEmail') || '');
    setUserWhatsApp(localStorage.getItem('userWhatsApp') || '');
    setProfilePic(localStorage.getItem('profilePic'));
    setMonthlyIncome(localStorage.getItem('monthlyIncome') || '');
    setPayday(localStorage.getItem('payday') || '');
    setIncomeSound(localStorage.getItem('incomeSound') || 'cash-register.mp3');
    setExpenseSound(localStorage.getItem('expenseSound') || 'swoosh.mp3');
    setIsBiometricRegistered(!!localStorage.getItem('webauthn-credential-id'));
    
    const storedNotifications = localStorage.getItem('notificationSettings');
    if (storedNotifications) {
      setNotifications(JSON.parse(storedNotifications));
    }
    
    // Check permission again when tab becomes visible, as user might have changed it in another tab
    document.addEventListener('visibilitychange', checkNotificationPermission);
    return () => document.removeEventListener('visibilitychange', checkNotificationPermission);

  }, []);

  const handleRequestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        toast({ variant: 'destructive', title: 'Navegador não suporta notificações' });
        return;
    }
    
    if (Notification.permission === 'denied') {
        toast({
            variant: 'destructive',
            title: 'Permissão Bloqueada',
            description: 'Você precisa habilitar as notificações manualmente nas configurações do seu navegador.',
        });
        return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
     if (permission === 'granted') {
      toast({
        title: 'Notificações Ativadas!',
        description: 'Você receberá os alertas do sistema.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Notificações Bloqueadas',
        description: 'Você precisa permitir as notificações nas configurações do seu navegador.',
      });
    }
  };
  
  const handleRegisterBiometrics = async () => {
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
            rp: {
                name: "FinanceFlow App",
                id: window.location.hostname,
            },
            user: {
                id: Uint8Array.from(atob(userId.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
                name: userEmail,
                displayName: userName,
            },
            pubKeyCredParams: [
                { type: "public-key", alg: -7 }, // ES256
                { type: "public-key", alg: -257 }, // RS256
            ],
            authenticatorSelection: {
                authenticatorAttachment: "platform",
                userVerification: "required",
                requireResidentKey: true,
            },
            timeout: 60000,
            attestation: "direct",
        };

        const credential = await navigator.credentials.create({ publicKey: options });
        
        if (credential && (credential as PublicKeyCredential).rawId) {
            localStorage.setItem('webauthn-credential-id', bufferToBase64Url((credential as PublicKeyCredential).rawId));
            setIsBiometricRegistered(true);
            toast({
                title: 'Sucesso!',
                description: 'Sua impressão digital foi cadastrada com sucesso.',
            });
        }

    } catch (err) {
        console.error("Erro no cadastro biométrico:", err);
        const error = err as Error;
        toast({
            variant: 'destructive',
            title: 'Falha no Cadastro',
            description: `Não foi possível cadastrar a impressão digital. (${error.name}: ${error.message})`,
        });
    } finally {
        setIsRegistering(false);
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
    localStorage.setItem('monthlyIncome', monthlyIncome);
    localStorage.setItem('payday', payday);
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


  if (!isMounted) {
    return null; 
  }

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
          <CardTitle className="flex items-center gap-2"><UserCircle className="h-5 w-5" /> Perfil</CardTitle>
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
          <CardDescription>Gerencie o acesso à sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-2">
                <Label>Acesso Biométrico</Label>
                 {isBiometricSupported ? (
                    <div className="flex items-center justify-between rounded-md border p-4">
                    <div>
                        <p className="font-medium">Login com Impressão Digital</p>
                        <p className="text-sm text-muted-foreground">
                        {isBiometricRegistered ? "Acesso biométrico está ativado." : "Cadastre sua digital para um login rápido."}
                        </p>
                    </div>
                    <Button onClick={handleRegisterBiometrics} disabled={isRegistering || isBiometricRegistered}>
                        {isRegistering ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : ( <Fingerprint className="mr-2 h-4 w-4" />)}
                        {isBiometricRegistered ? 'Cadastrado' : 'Cadastrar'}
                    </Button>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground p-4 border rounded-md">O acesso biométrico não é suportado neste navegador ou dispositivo.</p>
                )}
            </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Configuração Financeira</CardTitle>
          <CardDescription>Informe sua renda para um melhor planejamento e cálculo do fluxo diário.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <Label htmlFor="monthly-income">Renda Mensal (R$)</Label>
                    <Input 
                        id="monthly-income" 
                        type="number" 
                        placeholder="ex: 3500.00" 
                        value={monthlyIncome}
                        onChange={(e) => setMonthlyIncome(e.target.value)}
                    />
                </div>
                 <div>
                    <Label htmlFor="payday">Dia do Recebimento</Label>
                    <Input 
                        id="payday" 
                        type="number" 
                        min="1" max="31" 
                        placeholder="ex: 5" 
                        value={payday}
                        onChange={(e) => setPayday(e.target.value)}
                    />
                </div>
            </div>
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
                    <p className="text-sm text-muted-foreground">Receba alertas diretamente na barra de notificação do seu celular.</p>
                </div>
                {notificationPermission === 'granted' && <span className="text-sm font-medium text-green-600">Ativado</span>}
                {notificationPermission === 'denied' && (
                    <Button onClick={handleRequestNotificationPermission} size="sm" variant="destructive">
                        Bloqueado
                    </Button>
                )}
                {notificationPermission === 'default' && (
                    <Button onClick={handleRequestNotificationPermission} size="sm" variant="outline">
                        <BellRing className="mr-2 h-4 w-4" />
                        Ativar
                    </Button>
                )}
              </div>
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
