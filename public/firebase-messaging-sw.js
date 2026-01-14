// Importar os scripts de compatibilidade do Firebase
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// Suas credenciais do Firebase (serão substituídas no cliente, mas necessárias para inicialização)
// É seguro tê-las aqui, pois este ficheiro é público. A segurança é feita nas regras do Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyC5d98JbKWbtkXyFKQui2baPdVmdgRbzas",
  authDomain: "financeflow-we0in.firebaseapp.com",
  projectId: "financeflow-we0in",
  storageBucket: "financeflow-we0in.appspot.com",
  messagingSenderId: "1083416954344",
  appId: "1:1083416954344:web:8064d8a5b9e5999086f0d4"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png' // Certifique-se que este ícone existe em /public
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
