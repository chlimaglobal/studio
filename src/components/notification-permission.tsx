'use client';

import { useEffect } from 'react';
import { app } from '@/lib/firebase'; // Import the initialized app
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { useAuth } from '@/components/providers/app-providers';
import { saveFcmToken } from '@/lib/storage';

export function NotificationPermission() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    async function requestPermissionAndGetToken() {
      // Check for browser support first
      const supported = await isSupported();
      if (!supported) {
        console.log('Firebase Messaging is not supported in this browser.');
        return;
      }
      
      const messagingInstance = getMessaging(app);
        
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const fcmToken = await getToken(messagingInstance, {
                vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            });

            if (fcmToken) {
                await saveFcmToken(user!.uid, fcmToken);
            } else {
                console.log('No registration token available. Request permission to generate one.');
            }
        } else {
            console.log('Unable to get permission to notify.');
        }
      } catch (error) {
        console.error('An error occurred while retrieving token. ', error);
      }
    }

    // Delay to ensure the service worker has time to be ready
    const timer = setTimeout(() => {
        requestPermissionAndGetToken();
    }, 3000);

    return () => clearTimeout(timer);
  }, [user]);

  return null;
}
