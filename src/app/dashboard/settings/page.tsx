
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Moon, Palette, Sun, Smartphone, Bell, WalletCards, DollarSign, Music, Play, UserCircle, Fingerprint, Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type FabPosition = 'left' | 'right';

const incomeSounds = [
    { value: 'cash-register.mp3', label: 'Caixa Registradora' },
    { value: 'coin.mp3', label: 'Moeda' },
    { value: 'none', label: 'Nenhum' },
];

const expenseSounds = [
    { value: 'swoosh.mp3', label: 'Swoosh' },
    { value: 'none', label: 'Nenhum' },
];

export default function SettingsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [fabPosition, setFabPosition] = useState<FabPosition>('right');
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [payday, setPayday] = useState('');
  const [incomeSound, setIncomeSound] = useState('cash-register.mp3');
  const [expenseSound, setExpenseSound] = useState('swoosh.mp3');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricRegistered, setIsBiometricRegistered] = useState(false);


  useEffect(() => {
    setIsMounted(true);
    // Check for WebAuthn support
    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(supported => {
            setIsBiometricSupported(supported);
        });
    }

    const storedUserName = localStorage.getItem('userName') || 'Marcos Lima';
    setUserName(storedUserName);

    const storedUserEmail = localStorage.getItem('userEmail') || 'marcos.lima@example.com';
    setUserEmail(storedUserEmail);

    const storedFabPosition = localStorage.getItem('fabPosition') as FabPosition;
    if (storedFabPosition) setFabPosition(storedFabPosition);
    
    const storedPushEnabled = localStorage.getItem('pushNotificationsEnabled') === 'true';
    setPushNotificationsEnabled(storedPushEnabled);

    const storedIncome = localStorage.getItem('monthlyIncome');
    if (storedIncome) setMonthlyIncome(storedIncome);

    const storedPayday = localStorage.getItem('payday');
    if (storedPayday) setPayday(storedPayday);

    const storedIncomeSound = localStorage.getItem('incomeSound');
    if (storedIncomeSound) setIncomeSound(storedIncomeSound);

    const storedExpenseSound = localStorage.getItem('expenseSound');
    if (storedExpenseSound) setExpenseSound(storedExpenseSound);
    
    const storedCredential = localStorage.getItem('webauthn-credential-id');
    if (storedCredential) setIsBiometricRegistered(true);

  }, []);
  
  const handleRegisterBiometrics = async () => {
    setIsRegistering(true);
    try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);

        const options: PublicKeyCredentialCreationOptions = {
            challenge,
            rp: {
                name: "FinanceFlow App",
                id: window.location.hostname,
            },
            user: {
                id: userId,
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
        
        if (credential && 'id' in credential) {
            // In a real app, send credential to the server to store public key
            localStorage.setItem('webauthn-credential-id', credential.id);
            setIsBiometricRegistered(true);
            toast({
                title: 'Sucesso!',
                description: 'Sua impressão digital foi cadastrada com sucesso.',
            });
        }

    } catch (err) {
        console.error("Erro no cadastro biométrico:", err);
        toast({
            variant: 'destructive',
            title: 'Falha no Cadastro',
            description: 'Não foi possível cadastrar a impressão digital. Tente novamente.',
        });
    } finally {
        setIsRegistering(false);
    }
  }


  const handleFabPositionChange = (value: FabPosition) => {
    setFabPosition(value);
  };

  const handlePushNotificationsChange = (enabled: boolean) => {
    setPushNotificationsEnabled(enabled);
  };
  
  const playPreviewSound = (soundFile: string) => {
    if (!soundFile || soundFile === 'none' || typeof window === 'undefined') return;

    const audio = new Audio(`/${soundFile}`);
    const playPromise = audio.play();

    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.error("Audio playback error:", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao Tocar Som',
                description: 'Não foi possível reproduzir o áudio. Verifique as permissões de autoplay do seu navegador para este site.',
            });
        });
    }
  };


  const handleSave = () => {
    localStorage.setItem('userName', userName);
    localStorage.setItem('userEmail', userEmail);
    localStorage.setItem('fabPosition', fabPosition);
    localStorage.setItem('pushNotificationsEnabled', String(pushNotificationsEnabled));
    localStorage.setItem('monthlyIncome', monthlyIncome);
    localStorage.setItem('payday', payday);
    localStorage.setItem('incomeSound', incomeSound);
    localStorage.setItem('expenseSound', expenseSound);
    
    window.dispatchEvent(new Event('storage'));

    toast({
      title: 'Configurações Salvas!',
      description: 'Suas preferências foram atualizadas com sucesso.',
    });
  };

  if (!isMounted) {
    return null; 
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Configurações</h1>
          <p className="text-muted-foreground">Gerencie as preferências do aplicativo e da sua conta.</p>
        </div>
        <Button onClick={handleSave}>Salvar Alterações</Button>
      </div>

       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserCircle className="h-5 w-5" /> Perfil</CardTitle>
          <CardDescription>Edite seus dados pessoais.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Aparência</CardTitle>
          <CardDescription>Personalize a aparência do aplicativo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Tema</Label>
            <RadioGroup
              value={theme}
              onValueChange={setTheme}
              className="flex items-center gap-4"
            >
              <Label htmlFor="theme-light" className="flex cursor-pointer items-center gap-2 rounded-md border p-2 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                <RadioGroupItem value="light" id="theme-light" />
                <Sun className="h-4 w-4" /> Claro
              </Label>
              <Label htmlFor="theme-dark" className="flex cursor-pointer items-center gap-2 rounded-md border p-2 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                <RadioGroupItem value="dark" id="theme-dark" />
                <Moon className="h-4 w-4" /> Escuro
              </Label>
               <Label htmlFor="theme-system" className="flex cursor-pointer items-center gap-2 rounded-md border p-2 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                <RadioGroupItem value="system" id="theme-system" />
                <Smartphone className="h-4 w-4" /> Sistema
              </Label>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label>Posição do Botão Flutuante (Móvel)</Label>
             <RadioGroup
              value={fabPosition}
              onValueChange={(v) => handleFabPositionChange(v as FabPosition)}
              className="flex items-center gap-4"
            >
              <Label htmlFor="fab-left" className="flex cursor-pointer items-center gap-2 rounded-md border p-2 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                <RadioGroupItem value="left" id="fab-left" />
                Esquerda
              </Label>
              <Label htmlFor="fab-right" className="flex cursor-pointer items-center gap-2 rounded-md border p-2 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                <RadioGroupItem value="right" id="fab-right" />
                Direita
              </Label>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notificações</CardTitle>
          <CardDescription>Gerencie suas preferências de notificação e alertas sonoros.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-4">
            <div>
              <p className="font-medium">Notificações Push</p>
              <p className="text-sm text-muted-foreground">Receba alertas sobre seus gastos e receitas.</p>
            </div>
             <Switch
                checked={pushNotificationsEnabled}
                onCheckedChange={handlePushNotificationsChange}
             />
          </div>
           <div className="space-y-2 rounded-md border p-4">
             <Label className="flex items-center gap-2"><Music className="h-4 w-4" /> Sons de Notificação</Label>
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
          <div className="flex items-center justify-between rounded-md border p-4">
             <div>
              <p className="font-medium">Alertas de gastos excessivos</p>
              <p className="text-sm text-muted-foreground">Seja notificado sobre despesas incomuns.</p>
            </div>
             <Switch checked disabled />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    