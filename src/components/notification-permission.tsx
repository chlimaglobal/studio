
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { BellRing, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { messaging } from '@/lib/firebase';
import { getToken } from 'firebase/messaging';
import { useAuth } from './providers/client-providers';
import { saveFcmToken } from '@/lib/storage';

export function NotificationPermission() {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [isVisible, setIsVisible] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const hasBeenDismissed = localStorage.getItem('notification_prompt_dismissed');
      if (hasBeenDismissed) {
          setIsVisible(false);
          return;
      }

      setPermissionStatus(Notification.permission);
      if (Notification.permission === 'default') {
        const timer = setTimeout(() => setIsVisible(true), 5000); // Wait 5 seconds
        return () => clearTimeout(timer);
      }
    } else {
      setPermissionStatus('unsupported');
    }
  }, []);

  const handleRequestPermission = async () => {
    if (permissionStatus !== 'default' || typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }
  
    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      setIsVisible(false); // Hide the card after interaction
      localStorage.setItem('notification_prompt_dismissed', 'true');
  
      if (permission === 'granted') {
        toast({
          title: 'Notificações Ativadas!',
          description: 'Você receberá os alertas do sistema.',
        });
  
        // Get FCM Token and save it
        try {
          const fcm = await messaging();
          if (fcm && user) {
            const fcmToken = await getToken(fcm, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
            if (fcmToken) {
              await saveFcmToken(user.uid, fcmToken);
            }
          }
        } catch (error) {
          console.error('An error occurred while retrieving token. ', error);
        }
  
      } else {
        toast({
          variant: 'destructive',
          title: 'Notificações Bloqueadas',
          description: 'Você pode ativá-las nas configurações do seu navegador a qualquer momento.',
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('notification_prompt_dismissed', 'true');
  }
  
  if (permissionStatus !== 'default' || !isVisible) {
    return null;
  }

  return (
    <Card className="relative bg-card/80 backdrop-blur-sm border-primary/20 animate-in fade-in-50 slide-in-from-bottom-5">
        <button onClick={handleClose} className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-5 w-5" />
            <span className="sr-only">Fechar</span>
        </button>
      <CardHeader className="flex flex-row items-center gap-4 pr-10">
         <div className="p-3 rounded-full bg-primary/10 text-primary">
            <BellRing className="h-8 w-8" />
        </div>
        <div>
            <CardTitle>Receba Alertas Importantes</CardTitle>
            <CardDescription className="mt-1">
                Ative as notificações para ser avisado sobre vencimentos e dicas da Lúmina.
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

    