
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { BellRing, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function NotificationPermission() {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [isVisible, setIsVisible] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
      // Show the card only if permission is default (not yet granted or denied)
      if (Notification.permission === 'default') {
        // Add a small delay to not bombard the user immediately
        const timer = setTimeout(() => setIsVisible(true), 3000);
        return () => clearTimeout(timer);
      }
    } else {
      setPermissionStatus('unsupported');
    }
  }, []);

  const handleRequestPermission = async () => {
    if (permissionStatus === 'unsupported' || permissionStatus === 'granted') {
      return;
    }

    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);
    setIsVisible(false); // Hide the card after a decision is made

    if (permission === 'granted') {
      toast({
        title: 'Notificações Ativadas!',
        description: 'Você receberá as últimas atualizações.',
      });
      // Optional: send subscription to server
    } else {
      toast({
        variant: 'destructive',
        title: 'Notificações Bloqueadas',
        description: 'Você pode ativá-las nas configurações do seu navegador a qualquer momento.',
      });
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  }
  
  // Render nothing if permission is not default, or if the component is hidden
  if (permissionStatus !== 'default' || !isVisible) {
    return null;
  }

  return (
    <Card className="relative bg-card/80 backdrop-blur-sm border-primary/20">
        <button onClick={handleClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
        </button>
      <CardHeader className="flex flex-row items-center gap-4">
         <div className="p-3 rounded-full bg-primary/10 text-primary">
            <BellRing className="h-8 w-8" />
        </div>
        <div>
            <CardTitle>Vamos ficar mais próximos?</CardTitle>
            <CardDescription className="mt-1">
                Ative as notificações e fique por dentro de todas as dicas, novidades e ofertas.
            </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Button className="w-full" onClick={handleRequestPermission}>
          Ativar Notificações
        </Button>
      </CardContent>
    </Card>
  );
}
