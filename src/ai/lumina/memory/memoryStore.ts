'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

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
