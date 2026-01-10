
'use client';

import { useEffect } from 'react';
import { messaging } from '@/lib/firebase';
import { getToken } from 'firebase/messaging';
import { useAuth } from '@/components/providers/client-providers';
import { saveFcmToken } from '@/lib/storage';

export function NotificationPermission() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !messaging) return;

    async function requestPermission() {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const fcm = await messaging();
        if (fcm) {
          const token = await getToken(fcm, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          });

          if (token) {
            await saveFcmToken(user.uid, token);
          }
        }
      } catch (error) {
        console.error('Erro ao obter token FCM:', error);
      }
    }

    requestPermission();
  }, [user]);

  return null;
}
