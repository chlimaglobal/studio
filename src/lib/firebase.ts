// src/lib/firebase.ts
// Arquivo de infraestrutura (NÃO é Client Component)

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  // Se você usa Realtime Database, adicione:
  // databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

// Validação mais completa (opcional, mas útil em produção)
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
for (const key of requiredKeys) {
  if (!firebaseConfig[key]) {
    throw new Error(
      `Firebase config incompleta: variável NEXT_PUBLIC_FIREBASE_${key.toUpperCase()} não definida. ` +
      'Verifique .env.local ou environment variables no Firebase App Hosting.'
    );
  }
}

// Singleton
const app: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Serviços (lazy-initialized quando importados)
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const functions: Functions = getFunctions(app, 'us-central1');
export const storage: FirebaseStorage = getStorage(app);
export { app };