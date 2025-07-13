
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Moon, Palette, Sun, Smartphone, Bell, WalletCards, DollarSign } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Input } from '@/components/ui/input';

type FabPosition = 'left' | 'right';

export default function SettingsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  const [fabPosition, setFabPosition] = useState<FabPosition>('right');
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [payday, setPayday] = useState('');


  useEffect(() => {
    setIsMounted(true);
    const storedFabPosition = localStorage.getItem('fabPosition') as FabPosition;
    if (storedFabPosition) setFabPosition(storedFabPosition);
    
    const storedPushEnabled = localStorage.getItem('pushNotificationsEnabled') === 'true';
    setPushNotificationsEnabled(storedPushEnabled);

    const storedIncome = localStorage.getItem('monthlyIncome');
    if (storedIncome) setMonthlyIncome(storedIncome);

    const storedPayday = localStorage.getItem('payday');
    if (storedPayday) setPayday(storedPayday);

  }, []);

  const handleFabPositionChange = (value: FabPosition) => {
    setFabPosition(value);
  };

  const handlePushNotificationsChange = (enabled: boolean) => {
    setPushNotificationsEnabled(enabled);
  };
  
  const handleSave = () => {
    localStorage.setItem('fabPosition', fabPosition);
    localStorage.setItem('pushNotificationsEnabled', String(pushNotificationsEnabled));
    localStorage.setItem('monthlyIncome', monthlyIncome);
    localStorage.setItem('payday', payday);
    
    // Dispara um evento para notificar outros componentes (como o dashboard) das mudanças.
    window.dispatchEvent(new Event('storage'));

    toast({
      title: 'Configurações Salvas!',
      description: 'Suas preferências foram atualizadas com sucesso.',
    });
  };

  if (!isMounted) {
    return null; // or a skeleton loader
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
          <CardDescription>Gerencie suas preferências de notificação.</CardDescription>
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
