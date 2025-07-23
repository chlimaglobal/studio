
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  "projectId": "financeflow-we0in",
  "appId": "1:123511329863:web:a81c91b72098fa668d8d62",
  "storageBucket": "financeflow-we0in.firebasestorage.app",
  "apiKey": "AIzaSyC5d98JbKWbtkXyFKQui2baPdVmdgRbzas",
  "authDomain": "financeflow-we0in.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "123511329863"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
