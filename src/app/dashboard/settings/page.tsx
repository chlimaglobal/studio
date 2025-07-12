
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Moon, Palette, Sun, Smartphone } from 'lucide-react';
import { useTheme } from 'next-themes';

type FabPosition = 'left' | 'right';

export default function SettingsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  // State for FAB position
  const [fabPosition, setFabPosition] = useState<FabPosition>('right');

  useEffect(() => {
    setIsMounted(true);
    const storedFabPosition = localStorage.getItem('fabPosition') as FabPosition;
    if (storedFabPosition) {
      setFabPosition(storedFabPosition);
    }
  }, []);

  const handleFabPositionChange = (value: FabPosition) => {
    setFabPosition(value);
    localStorage.setItem('fabPosition', value);
    // This is a bit of a hack to notify other components.
    // In a real app, you'd use a state management library (Context, Redux, etc.)
    window.dispatchEvent(new Event('storage'));
  };
  
  const handleSave = () => {
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
            <Label>Posição do Menu Flutuante (Móvel)</Label>
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
          <CardTitle>Notificações</CardTitle>
          <CardDescription>Gerencie suas preferências de notificação.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-4">
            <div>
              <p className="font-medium">Notificações Push</p>
              <p className="text-sm text-muted-foreground">Receba alertas sobre seus gastos e receitas.</p>
            </div>
             <Switch disabled />
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
