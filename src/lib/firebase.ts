
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

// Initialize Firebase
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Export service instances
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');
export const storage = getStorage(app);
export { app }; // Also export app itself

// Messaging is special and should only be initialized on the client
export const messaging = async () => {
    if (typeof window !== 'undefined' && (await isSupported())) {
        return getMessaging(app);
    }
    return null;
};
