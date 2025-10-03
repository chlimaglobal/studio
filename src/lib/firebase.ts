
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from "firebase/functions";
import { getMessaging, isSupported } from "firebase/messaging";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  "apiKey": "b2baa9ff-ac6f-4413-80a9-eacd43c20c04",
  "projectId": "financeflow-we0in",
  "appId": "1:123511329863:web:a81c91b72098fa668d8d62",
  "storageBucket": "financeflow-we0in.firebasestorage.app",
  "authDomain": "financeflow-we0in.firebaseapp.com",
  "measurementId": "G-EW74L3HEX7",
  "messagingSenderId": "123511329863"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app, 'us-central1'); // Specify region if not us-central1

// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = async () => {
    const supported = await isSupported();
    return supported ? getMessaging(app) : null;
};

export { db, auth, app, functions, httpsCallable, messaging };
