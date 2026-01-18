
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from "firebase/messaging";
import { getFunctions } from 'firebase/functions';


// ---- CONFIG DO SEU PROJETO FIREBASE ----
const firebaseConfig = {
  apiKey: "AIzaSyD7H3wU8pB8pH-xmTxJhUZCsPa-PP_L0cY",
  authDomain: "financeflow-we0in.firebaseapp.com",
  projectId: "financeflow-we0in",
  storageBucket: "financeflow-we0in.appspot.com",
  messagingSenderId: "123511329863",
  appId: "1:123511329863:web:a81c91b72098fa668d8d62",
  measurementId: "G-EW74L3HEX7",
};

// ---- INICIALIZAÇÃO SEGURA ----
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ---- SERVICES ----
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1'); // Specify region for consistency
export { app }; // Exportando a instância do app


// Initialize Firebase Cloud Messaging and get a reference to the service
export const messaging = async () => {
    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
        const supported = await isSupported();
        return supported ? getMessaging(app) : null;
    }
    return null;
};
