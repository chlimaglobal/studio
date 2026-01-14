// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from "firebase/messaging";
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');
export const storage = getStorage(app);
export { app };

export const messaging = async () => {
    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
        if ('serviceWorker' in navigator) {
            // Passa a configuração do Firebase de forma segura para o Service Worker
            // através de um query parameter. Isso evita hardcoding de chaves no SW.
            const firebaseConfigParams = encodeURIComponent(JSON.stringify(firebaseConfig));
            const swUrl = `/firebase-messaging-sw.js?firebaseConfig=${firebaseConfigParams}`;
            
            try {
                // REGISTRO DO SERVICE WORKER. Ocorre antes de qualquer tentativa de obter o token.
                const registration = await navigator.serviceWorker.register(swUrl);
                console.log('Service Worker registration successful with scope: ', registration.scope);
            } catch (err) {
                console.error('Service Worker registration failed: ', err);
            }
        }
        
        const supported = await isSupported();
        // A obtenção do token (getToken) é feita posteriormente no componente NotificationPermission,
        // garantindo que o registro do SW já tenha ocorrido.
        return supported ? getMessaging(app) : null;
    }
    return null;
};
