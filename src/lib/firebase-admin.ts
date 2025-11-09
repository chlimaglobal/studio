
import * as admin from 'firebase-admin';

// This file is re-exporting admin types and services but NOT initializing the app.
// The app initialization is handled in firebase-server.ts to ensure it's only run on the server.

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!admin.apps.length && serviceAccountString) {
    try {
        const serviceAccount = JSON.parse(serviceAccountString);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (e) {
        console.error('Firebase Admin initialization error: Invalid service account credentials in firebase-admin.ts', e);
    }
} else if (!serviceAccountString) {
     console.warn('Firebase Admin SDK could not be initialized in firebase-admin.ts. FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
}


export const adminApp = admin.apps.length > 0 ? admin.app() : undefined;
export const adminAuth = admin.apps.length > 0 ? admin.auth() : undefined;
export const adminDb = admin.apps.length > 0 ? admin.firestore() : undefined;
