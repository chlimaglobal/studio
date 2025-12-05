'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

interface UserMemory {
  preferences?: Record<string, any>;
  facts?: Record<string, any>;
  financialHabits?: Record<string, any>;
  dontSay?: string[];
  updatedAt?: Timestamp;
}

const MEMORY_COLLECTION = 'userMemory';

/**
 * Retrieves the stored memory for a given user.
 * @param userId The ID of the user.
 * @returns A promise that resolves to the user's memory object or null if not found.
 */
export async function getUserMemory(userId: string): Promise<UserMemory | null> {
  if (!userId) return null;
  try {
    const memoryDocRef = doc(db, MEMORY_COLLECTION, userId);
    const docSnap = await getDoc(memoryDocRef);

    if (docSnap.exists()) {
      return docSnap.data() as UserMemory;
    }
    return null;
  } catch (error) {
    console.error("Error getting user memory:", error);
    return null;
  }
}

/**
 * Saves or updates a user's memory.
 * @param userId The ID of the user.
 * @param memoryData The memory data to save. It will be merged with existing data.
 */
export async function saveUserMemory(userId: string, memoryData: Partial<UserMemory>): Promise<void> {
  if (!userId) return;
  try {
    const memoryDocRef = doc(db, MEMORY_COLLECTION, userId);
    const dataToSave = {
      ...memoryData,
      updatedAt: Timestamp.now(),
    };
    await setDoc(memoryDocRef, dataToSave, { merge: true });
  } catch (error) {
    console.error("Error saving user memory:", error);
  }
}


/**
 * Analyzes a user's message and updates their memory profile.
 * @param userId The ID of the user.
 * @param text The user's message content.
 */
export async function updateMemoryFromMessage(userId: string, text: string): Promise<void> {
    const toSave: Partial<UserMemory> = {};
    const lowerText = text.toLowerCase();

    // Preference detection
    if (lowerText.includes('prefiro') || lowerText.includes('gosto mais de') || lowerText.includes('sempre uso')) {
        toSave.preferences = { lastPreference: text };
    }

    // "Don't say" detection
    if (lowerText.includes('não fale') || lowerText.includes('não gosto que você diga') || lowerText.includes('pare de dizer')) {
        toSave.dontSay = [text]; // For now, we overwrite. A better approach would be to push to an array.
    }

    // Financial habits detection
    if (/\b(gasto|despesa|compro|pago)\b/.test(lowerText) && text.length > 20) {
        toSave.financialHabits = { lastMentionedHabit: text };
    }

    // General facts
    if (text.length > 15 && !Object.keys(toSave).length) {
         toSave.facts = { lastFact: text };
    }
    
    if (Object.keys(toSave).length > 0) {
        const memoryDocRef = doc(db, MEMORY_COLLECTION, userId);
        try {
            // Use updateDoc for targeted field updates without overwriting the whole document
             await setDoc(memoryDocRef, { ...toSave, updatedAt: Timestamp.now() }, { merge: true });
        } catch (e) {
            console.error("Error updating user memory from message:", e);
        }
    }
}
