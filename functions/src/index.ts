
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from 'firebase-functions/v2';

// Set the region to 'southamerica-east1' for all functions
setGlobalOptions({ region: 'southamerica-east1' });


// Export all functions from the /lib/firebase-functions.ts file
export * from '../../src/lib/firebase-functions';
