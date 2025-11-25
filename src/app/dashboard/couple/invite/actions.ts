
"use server";

// This file is deprecated. The logic has been moved to Cloud Functions
// in 'src/lib/firebase-functions.ts' to ensure a clear separation
// between client-side and server-side code.
//
// Client components now call these functions using httpsCallable().

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

// You can create client-side wrappers here if you want, but it's often cleaner
// to call the httpsCallable function directly from the component that needs it.
// Example:
/*
  import { httpsCallable } from 'firebase/functions';
  import { functions } from '@/lib/firebase';

  async function invitePartner(email: string) {
    const linkPartner = httpsCallable(functions, 'linkPartner');
    try {
      const result = await linkPartner({ partnerEmail: email });
      return result.data;
    } catch (error) {
      console.error("Error calling linkPartner function:", error);
      throw error;
    }
  }
*/
