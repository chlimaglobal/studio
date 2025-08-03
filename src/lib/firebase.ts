
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBSEkWWuSNX1Gss2vUBvfL5Fkt9xX9Ic-E",
  authDomain: "corretor-pro-adef9.firebaseapp.com",
  projectId: "corretor-pro-adef9",
  storageBucket: "corretor-pro-adef9.firebasestorage.app",
  messagingSenderId: "234828894841",
  appId: "1:234828894841:web:64e92960d03a267e47baa8",
  measurementId: "G-95XLYRV9B7"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, app };
