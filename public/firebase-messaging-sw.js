// Scripts for Firebase v9+
import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging/sw";

// Initialize the Firebase app in the service worker
// "self" is a global variable that refers to the service worker scope
self.addEventListener("fetch", () => {
    try {
        const firebaseConfig = new URL(location).searchParams.get("firebaseConfig");
        if (!firebaseConfig) {
             throw new Error('Firebase Config object not found in service worker query params.');
        }
        
        const app = initializeApp(JSON.parse(firebaseConfig));
        getMessaging(app);

    } catch (error) {
        console.error("Error initializing Firebase in service worker:", error);
    }
});
