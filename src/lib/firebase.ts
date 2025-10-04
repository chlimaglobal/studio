
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from "firebase/functions";
import { getMessaging, isSupported } from "firebase/messaging";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  "apiKey": "AIzaSyC8i_841JmY1TfA-Gk9pXyY2s-k3g0u8Yw",
  "authDomain": "financeflow-we0in.firebaseapp.com",
  "projectId": "financeflow-we0in",
  "storageBucket": "financeflow-we0in.appspot.com",
  "messagingSenderId": "233857398324",
  "appId": "1:233857398324:web:e0f8b704c7c89b37803ba9",
  "measurementId": "G-5511W442E5"
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
