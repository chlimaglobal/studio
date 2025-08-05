
import * as admin from 'firebase-admin';

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!admin.apps.length) {
  if (serviceAccountString) {
    try {
      const serviceAccount = JSON.parse(serviceAccountString);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (e) {
      console.error('Firebase Admin initialization error: Invalid service account credentials.', e);
    }
  } else {
    console.warn('Firebase Admin SDK not initialized. FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
  }
}

export const adminApp = admin.apps.length > 0 ? admin.app() : undefined;
export const adminAuth = admin.apps.length > 0 ? admin.auth() : undefined;
export const adminDb = admin.apps.length > 0 ? admin.firestore() : undefined;
