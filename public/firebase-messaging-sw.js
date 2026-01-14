// /public/firebase-messaging-sw.js

// Importa os SDKs de compatibilidade do Firebase. Use a versão mais recente compatível.
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// CONFIGURAÇÃO ESTÁTICA E OBRIGATÓRIA DO FIREBASE
// Estes valores são públicos e necessários para o SW identificar o projeto correto.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Inicialização segura e síncrona do Firebase
// Garante que o app só seja inicializado uma vez.
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

// Handler para mensagens recebidas quando o app está em segundo plano ou fechado
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Mensagem recebida em segundo plano: ", payload);

  // Extrai o payload de 'data' para compatibilidade universal (Android/iOS)
  // O backend DEVE enviar o payload dentro do campo 'data'.
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: payload.data.icon || "/icon-192x192.png", // Ícone padrão
    data: {
      url: payload.data.url // URL para abrir ao clicar na notificação
    }
  };

  // Exibe a notificação manualmente, garantindo controle total
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Listener para o evento de clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Fecha a notificação assim que clicada

  const urlToOpen = event.notification.data.url || '/';
  
  // Procura por uma aba/janela do app que já esteja aberta e foca nela.
  // Se não encontrar, abre uma nova janela.
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      for (const client of clientList) {
        // Usa `new URL` para comparar apenas o pathname, ignorando query params
        if ((new URL(client.url)).pathname === (new URL(urlToOpen, self.location.origin)).pathname && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
