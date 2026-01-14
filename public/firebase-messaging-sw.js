// Importar os scripts do Firebase para compatibilidade.
// Usamos uma versão recente e estável do SDK v9 em modo de compatibilidade.
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// As credenciais do Firebase serão buscadas dinamicamente.
// Não é seguro deixá-las hardcoded aqui.
const urlParams = new URLSearchParams(location.search);
const firebaseConfig = {
    apiKey: urlParams.get("apiKey"),
    authDomain: urlParams.get("authDomain"),
    projectId: urlParams.get("projectId"),
    storageBucket: urlParams.get("storageBucket"),
    messagingSenderId: urlParams.get("messagingSenderId"),
    appId: urlParams.get("appId"),
};

// Inicializa o app Firebase no Service Worker
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handler para mensagens recebidas em segundo plano.
// Este é o ponto crucial para o funcionamento com o app fechado.
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );

  // Extrai o título e o corpo do campo 'data', não de 'notification'.
  // Isto é OBRIGATÓRIO para compatibilidade com iOS Web Push.
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: "/icon-192x192.png", // Ícone da notificação
    data: {
      url: payload.data.url || '/' // URL para abrir ao clicar na notificação
    }
  };

  // Exibe a notificação manualmente, garantindo controle total.
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Adiciona um listener para o clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
    }).then((clientList) => {
      // Se um cliente (aba/janela) já estiver aberto, foca nele.
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Se não, abre uma nova janela.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
