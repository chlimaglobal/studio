
// Import and initialize the Firebase SDK
// This is required to get the messaging service object.
import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC5d98JbKWbtkXyFKQui2baPdVmdgRbzas",
  authDomain: "financeflow-we0in.firebaseapp.com",
  projectId: "financeflow-we0in",
  storageBucket: "financeflow-we0in.appspot.com",
  messagingSenderId: "1074128612143",
  appId: "1:1074128612143:web:04c538a7c251f21151c8e7"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// This part of the code is executed when a push notification is received
// while the app is in the background or closed.
// You can customize the notification title, body, icon, etc. here.
// For now, it will show the notification as sent from the server.
self.addEventListener('push', (event) => {
  const notification = event.data.json().notification;
  event.waitUntil(
    self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: notification.icon,
    })
  );
});
