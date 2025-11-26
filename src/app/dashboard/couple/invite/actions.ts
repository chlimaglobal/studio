'use server';

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
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

  if (senderEmail === partnerEmail) {
    return { success: false, error: 'Você não pode convidar a si mesmo.' };
  }

  try {
    const inviteRef = adminDb.collection('invites').doc();

    const inviteData = {
      sentBy: senderUid,
      sentByName: senderName,
      sentByEmail: senderEmail,
      sentToEmail: partnerEmail,
      sentTo: null, // This can be filled later if the user exists
      status: 'pending',
      createdAt: Timestamp.now(),
    };

    await inviteRef.set(inviteData);
    
    // The onInviteCreated trigger in firebase-functions.ts will handle the email.
    
    revalidatePath('/dashboard/couple');

    return { success: true, message: 'Convite enviado com sucesso!' };

  } catch (error) {
    console.error('Error in sendInvite Server Action:', error);
    return { success: false, error: 'Ocorreu um erro no servidor ao tentar enviar o convite.' };
  }
}
