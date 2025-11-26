
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, initializeAuth, indexedDBLocalPersistence } from 'firebase/auth';
import { getFunctions, httpsCallable } from "firebase/functions";
import { getMessaging, isSupported } from "firebase/messaging";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  "projectId": "financeflow-we0in",
  "appId": "1:123511329863:web:a81c91b72098fa668d8d62",
  "apiKey": "AIzaSyC5d98JbKWbtkXyFKQui2baPdVmdgRbzas",
  "authDomain": "financeflow-we0in.firebaseapp.com",
  "measurementId": "G-EW74L3HEX7",
  "messagingSenderId": "123511329863",
  "storageBucket": "financeflow-we0in.appspot.com"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Initialize Firebase Auth with persistence
const auth = initializeAuth(app, {
  persistence: indexedDBLocalPersistence,
  // Add the development domain to prevent auth token errors
  authDomain: [
    "financeflow-we0in.firebaseapp.com",
    "*.cluster-qhrn7lb3szcfcud6uanedbkjnm.cloudworkstations.dev"
  ],
});

// Correctly initialize Firebase Functions for the specific region
const functions = getFunctions(app, 'southamerica-east1');

// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = async () => {
    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
        const supported = await isSupported();
        return supported ? getMessaging(app) : null;
    }
    return null;
};

export { db, auth, app, functions, httpsCallable, messaging };
