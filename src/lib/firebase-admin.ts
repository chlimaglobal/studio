import * as admin from 'firebase-admin';

let app: admin.app.App | undefined;

if (!admin.apps.length) {
    try {
        const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!serviceAccountString) {
            throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT não está definida.');
        }
        const serviceAccount = JSON.parse(serviceAccountString);
        app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (e: any) {
        console.error('Falha na inicialização do Firebase Admin SDK:', e.message);
    }
} else {
    app = admin.app();
}

export const adminApp = app;
export const adminAuth = app ? admin.auth() : undefined;
export const adminDb = app ? admin.firestore() : undefined;
