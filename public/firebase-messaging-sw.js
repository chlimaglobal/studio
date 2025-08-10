
// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
// "Default" Firebase configuration (prevents errors)
const defaultConfig = {
  apiKey: true,
  projectId: true,
  messagingSenderId: true,
  appId: true,
};

// This needs to be replaced with your actual config
const firebaseConfig = {
  "projectId": "financeflow-we0in",
  "appId": "1:123511329863:web:a81c91b72098fa668d8d62",
  "storageBucket": "financeflow-we0in.firebasestorage.app",
  "apiKey": "AIzaSyC5d98JbKWbtkXyFKQui2baPdVmdgRbzas",
  "authDomain": "financeflow-we0in.firebaseapp.com",
  "measurementId": "G-EW74L3HEX7",
  "messagingSenderId": "123511329863"
};

firebase.initializeApp(firebaseConfig || defaultConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages
if (firebase.messaging.isSupported()) {
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage(function(payload) {
        console.log('Received background message ', payload);
        // Customize notification here
        const notificationTitle = payload.notification.title;
        const notificationOptions = {
            body: payload.notification.body,
            icon: '/icon.png'
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });
}
