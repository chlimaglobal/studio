'use client';

import { getMessaging, isSupported } from 'firebase/messaging';
import { app } from './firebase';
import type { Messaging } from 'firebase/messaging';

/**
 * Safely gets the Firebase messaging instance, only on the client side.
 * Returns null if messaging is not supported or if run on the server.
 * @returns A promise that resolves to the Messaging instance or null.
 */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const supported = await isSupported();
    if (!supported) {
      console.log('Firebase Messaging is not supported in this browser.');
      return null;
    }
    return getMessaging(app);
  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error);
    return null;
  }
}
