'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

// Interface for the data passed to the server action
interface SendInvitePayload {
    partnerEmail: string;
    senderUid: string;
    senderName: string;
    senderEmail: string;
}

export async function sendInvite(payload: SendInvitePayload) {
  const { partnerEmail, senderUid, senderName, senderEmail } = payload;

  if (!partnerEmail || !senderUid || !senderName || !senderEmail) {
    return { success: false, error: 'Dados insuficientes para enviar o convite.' };
  }

  if (senderEmail.toLowerCase() === partnerEmail.toLowerCase()) {
    return { success: false, error: 'Você não pode convidar a si mesmo.' };
  }

  try {
    // We write to a subcollection on the user's document.
    // This is allowed by security rules. A Cloud Function will process this.
    await addDoc(collection(db, 'invites'), {
      sentBy: senderUid,
      sentByName: senderName,
      sentByEmail: senderEmail,
      sentToEmail: partnerEmail.toLowerCase(),
      sentTo: null, // This will be populated by the Cloud Function
      status: 'pending',
      createdAt: Timestamp.now(),
    });

    revalidatePath('/dashboard/couple');

    return { success: true, message: 'Convite enviado com sucesso!' };

  } catch (error) {
    console.error('Error in sendInvite Server Action:', error);
    return { success: false, error: 'Ocorreu um erro no servidor ao tentar enviar o convite.' };
  }
}
