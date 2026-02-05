'use client';

import { useEffect } from 'react';
import { getToken } from 'firebase/messaging';
import { useAuth } from '@/components/providers/app-providers';
import { saveFcmToken } from '@/lib/storage';
import { getFirebaseMessaging } from '@/lib/firebase-messaging';

export function NotificationPermission() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    async function requestPermissionAndGetToken() {
      // The helper function already handles browser support checks
      const messagingInstance = await getFirebaseMessaging();
      if (!messagingInstance) {
        console.log('Firebase Messaging is not supported in this browser.');
        return;
      }
        
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
