// /public/firebase-messaging-sw.js
// As versões do SDK são importadas para garantir compatibilidade e acesso às APIs necessárias.
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// As credenciais são passadas de forma segura pelo script de registro no lado do cliente (src/lib/firebase.ts).
// O Service Worker é inicializado quando o navegador o regista pela primeira vez.
self.addEventListener('fetch', event => {
  try {
    const url = new URL(event.request.url);
    // Este bloco garante que a inicialização ocorra apenas uma vez e de forma segura,
    // capturando a configuração passada como parâmetro na URL de registro do SW.
    if (url.pathname.endsWith('firebase-messaging-sw.js') && url.searchParams.has('firebaseConfig')) {
      const firebaseConfig = JSON.parse(decodeURIComponent(url.searchParams.get('firebaseConfig')));
      if (firebase.apps.length === 0) {
          firebase.initializeApp(firebaseConfig);
      }
    }
  } catch (e) {
    console.error('SW: Erro ao inicializar o Firebase:', e);
  }
});

// Garante que o messaging só será acessado após a inicialização.
const messaging = firebase.messaging();

// Handler para quando a notificação é recebida com o app em segundo plano.
// Isso é crucial para o funcionamento com o app fechado ou PWA instalado.
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Mensagem recebida em segundo plano: ", payload);

  // Extrai o payload de 'data' para compatibilidade universal (Android/iOS/Desktop).
  // O uso de 'data' em vez de 'notification' é obrigatório para iOS.
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: payload.data.icon || "/icon-192x192.png", // Ícone padrão
    data: {
      url: payload.data.url // URL para abrir ao clicar na notificação
    }
  };

  // Constrói e exibe a notificação manualmente.
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Listener para o evento de clique na notificação.
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Fecha a notificação

  const urlToOpen = event.notification.data.url || '/';
  
  // Tenta focar uma aba/janela já aberta do app. Se não encontrar, abre uma nova.
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
