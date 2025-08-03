
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  "projectId": "financeflow-we0in",
  "appId": "1:123511329863:web:a81c91b72098fa668d8d62",
  "storageBucket": "financeflow-we0in.firebasestorage.app",
  "apiKey": "AIzaSyC5d98JbKWbtkXyFKQui2baPdVmdgRbzas",
  "authDomain": "financeflow-we0in.firebaseapp.com",
  "measurementId": "G-EW74L3HEX7",
  "messagingSenderId": "123511329863"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, app };
