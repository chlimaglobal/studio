// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from "firebase/messaging";
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';


// ---- CONFIG DO SEU PROJETO FIREBASE ----
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// ---- INICIALIZAÇÃO SEGURA ----
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ---- SERVICES ----
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');
export const storage = getStorage(app);
export { app }; // Exportando a instância do app


// Initialize Firebase Cloud Messaging and get a reference to the service
export const messaging = async () => {
    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
        // Registra o Service Worker
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                console.log('Service Worker registration successful with scope: ', registration.scope);
            } catch (err) {
                console.log('Service Worker registration failed: ', err);
            }
        }
        
        const supported = await isSupported();
        return supported ? getMessaging(app) : null;
    }
    return null;
};
