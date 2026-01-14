// public/firebase-messaging-sw.js
import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging/sw';

// Cole aqui a configuração do seu projeto Firebase,
// que pode ser encontrada no Console do Firebase.
// É seguro expor essas chaves no lado do cliente.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// O Service Worker não precisa de mais nada aqui.
// Ele apenas inicializa o serviço de mensagens em segundo plano.
// A lógica de exibição de notificação é tratada automaticamente pelo Firebase
// quando a notificação é enviada com um campo `notification` pelo backend.
