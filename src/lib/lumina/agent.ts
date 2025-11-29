'use client';

import { sendMessageToLumina as callLuminaApi } from '@/ai/lumina/lumina';
import type { ChatMessage, AppUser } from '../types';

// Helper function to convert a File to a Base64 string
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

// Main function to send data to the Lumina API endpoint
export async function sendMessageToLumina({
  message,
  audioText,
  imageFile,
  chatHistory,
  allTransactions,
  isCoupleMode,
  isTTSActive,
  user,
  partner
}: {
  message: string,
  audioText?: string,
  imageFile: File | null,
  chatHistory: ChatMessage[],
  allTransactions: any[],
  isCoupleMode: boolean,
  isTTSActive: boolean,
  user: AppUser,
  partner: AppUser | null,
}) {
  let imageBase64: string | null = null;

  // If there's an image file, convert it to Base64
  if (imageFile) {
    imageBase64 = await fileToBase64(imageFile);
  }
  
  // Choose the correct API endpoint based on the mode
  const apiFunction = isCoupleMode ? callLuminaApi.couple : callLuminaApi.single;

  const body = {
    userQuery: message,
    audioText,
    imageBase64,
    chatHistory: chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      text: msg.text || '',
    })),
    allTransactions,
    isCoupleMode,
    isTTSActive,
    user: { displayName: user.displayName || '', uid: user.uid },
    partner: partner ? { displayName: partner.displayName || '', uid: partner.uid } : undefined,
  };

  try {
    // Await the API call directly. The Genkit flow is now responsible for updating Firestore.
    // The client will get the update via the onSnapshot listener.
    await apiFunction(body as any);

  } catch (error) {
    console.error("Error sending message to Lumina:", error);
    // You might want to update the UI to show an error state here,
    // though the Genkit flow should ideally handle its own errors.
  }
}
