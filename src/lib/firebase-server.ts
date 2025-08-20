
import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { credential } from 'firebase-admin';

function initAdminApp(): App {
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountString) {
    throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT não está definida.');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountString);
    if (getApps().length > 0) {
      return getApp();
    }
    return initializeApp({
      credential: credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('Falha ao inicializar o Firebase Admin SDK:', error.message);
    throw new Error('Credenciais da conta de serviço do Firebase inválidas.');
  }
}

export const nextApp = initAdminApp();
export const nextAuth = getAuth(nextApp);
