
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from "firebase/messaging";
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyD7H3wU8pB8pH-xmTxJhUZCsPa-PP_L0cY",
  authDomain: "financeflow-we0in.firebaseapp.com",
  projectId: "financeflow-we0in",
  storageBucket: "financeflow-we0in.appspot.com",
  messagingSenderId: "123511329863",
  appId: "1:123511329863:web:a81c91b72098fa668d8d62",
  measurementId: "G-EW74L3HEX7",
};

// Validação para garantir que as configurações essenciais não estão vazias
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("Firebase config is incomplete. Check your .env file.");
}


const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');
export const storage = getStorage(app);
export { app };

export const messaging = async () => {
    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
        if ('serviceWorker' in navigator) {
            const firebaseConfigParams = encodeURIComponent(JSON.stringify(firebaseConfig));
            const swUrl = `/firebase-messaging-sw.js?firebaseConfig=${firebaseConfigParams}`;
            
            try {
                const registration = await navigator.serviceWorker.register(swUrl);
                console.log('Service Worker registration successful with scope: ', registration.scope);
            } catch (err) {
                console.error('Service Worker registration failed: ', err);
            }
        }
        
        const supported = await isSupported();
        return supported ? getMessaging(app) : null;
    }
    return null;
};
