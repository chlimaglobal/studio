
import * as admin from 'firebase-admin';

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
let app: admin.app.App | undefined;

if (!admin.apps.length) {
    if (serviceAccountString) {
        try {
            const serviceAccount = JSON.parse(serviceAccountString);
            app = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        } catch (e) {
            console.error('Firebase Admin initialization error: Invalid service account credentials.', e);
        }
    } else {
         console.warn('Firebase Admin SDK could not be initialized. FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
    }
} else {
    app = admin.app();
}

export const adminApp = app;
export const adminAuth = app ? admin.auth() : undefined;
export const adminDb = app ? admin.firestore() : undefined;
