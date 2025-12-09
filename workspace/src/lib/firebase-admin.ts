import * as admin from 'firebase-admin';

let app: admin.app.App;

// Verifique se já existe uma instância para evitar reinicialização
if (!admin.apps.length) {
    try {
        const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!serviceAccountString) {
            throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT não está definida.');
        }
        
        // Garante que a string JSON seja parseada corretamente
        const serviceAccount = JSON.parse(Buffer.from(serviceAccountString, 'base64').toString('utf-8'));
        
        app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });

    } catch (e: any) {
        console.error('Falha na inicialização do Firebase Admin SDK:', e.message);
        // Em um cenário de produção, você pode querer lidar com isso de forma mais robusta.
        // Por enquanto, apenas logamos o erro. As variáveis adminAuth e adminDb serão indefinidas.
    }
} else {
    app = admin.app();
}

// Assegura que app seja exportado mesmo em caso de erro, mas pode ser undefined
export const adminApp = app!; 
export const adminAuth = app ? admin.auth() : undefined;
export const adminDb = app ? admin.firestore() : undefined;
