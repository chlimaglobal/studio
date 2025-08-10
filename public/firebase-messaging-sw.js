
// This file needs to be in the public directory.

// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Your web app's Firebase configuration
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
const app = firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle incoming messages. Called when:
// - received while app is in browser tab (foreground)
// - received when app is in background
// - received when app is closed
messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );
  
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
