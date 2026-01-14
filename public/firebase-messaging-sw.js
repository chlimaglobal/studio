// public/firebase-messaging-sw.js

// A importação do SDK do Firebase deve ser a primeira coisa no ficheiro
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// As credenciais são obtidas de forma segura através do IndexedDB quando o SW é inicializado pelo cliente
// Não é necessário colocar placeholders aqui; o SDK irá buscá-los automaticamente.
if (firebase.apps.length === 0) {
  // O SDK do Firebase busca a configuração do IndexedDB,
  // que é preenchido pelo script principal quando getMessaging() é chamado.
  // Isso evita a necessidade de passar config por query string ou hardcoding.
  firebase.initializeApp({
      apiKey: true,
      authDomain: true,
      projectId: true,
      storageBucket: true,
      messagingSenderId: true,
      appId: true,
  });
}

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Mensagem recebida em segundo plano: ", payload);

  // Extrai o payload de 'data' para compatibilidade universal (Android/iOS)
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: payload.data.icon || "/icon-192x192.png",
    data: {
      url: payload.data.url // URL para abrir ao clicar
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Listener para o clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Fecha a notificação

  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Se uma janela/aba do app já estiver aberta, foca nela
      for (const client of clientList) {
        if (new URL(client.url).pathname === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Se não, abre uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
