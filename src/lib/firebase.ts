
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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

// Initialize Firebase App (Singleton Pattern)
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Export initialized services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');
export const storage = getStorage(app);

// Export the app itself for use in client-side messaging initialization
export { app };
