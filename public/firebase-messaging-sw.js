// Importa os scripts de compatibilidade do Firebase para garantir o funcionamento em todos os cenários
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// O Service Worker é inicializado dinamicamente pelo script do cliente que passa a configuração
// de forma segura através dos parâmetros da URL.
// Isso evita a exposição de chaves de API no arquivo público.
self.addEventListener('fetch', event => {
  try {
    const url = new URL(event.request.url);
    if (url.pathname === '/firebase-messaging-sw.js' && url.searchParams.has('firebaseConfig')) {
      const firebaseConfig = JSON.parse(url.searchParams.get('firebaseConfig'));
      // Inicializa o Firebase apenas se ainda não foi inicializado
      if (firebase.apps.length === 0) {
          firebase.initializeApp(firebaseConfig);
      }
    }
  } catch (e) {
    console.error('Erro ao inicializar Firebase no Service Worker:', e);
  }
});


// Obtém a instância de mensagens
const messaging = firebase.messaging();

// Manipulador para mensagens recebidas quando o app está em segundo plano ou fechado
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Mensagem recebida em segundo plano: ", payload);

  // Valida a existência do payload 'data'
  if (!payload.data) {
    console.error("Payload 'data' não encontrado na notificação.");
    return;
  }

  // Constrói a notificação a partir do payload 'data' para compatibilidade total (incluindo iOS)
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: payload.data.icon || "/icon-192x192.png", // Ícone padrão
    data: {
      url: payload.data.url || '/' // URL para abrir ao clicar na notificação
    }
  };

  // Exibe a notificação
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manipulador para o evento de clique na notificação
self.addEventListener('notificationclick', (event) => {
  // Fecha a notificação
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';
  
  // Procura por uma janela/aba do app que já esteja aberta para focá-la
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      for (const client of clientList) {
        // Se encontrar uma aba com a mesma URL, foca nela
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Se nenhuma aba estiver aberta, abre uma nova
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
