
'use server';

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

const InviteSchema = z.object({
  email: z.string().email({ message: "Formato de e-mail inválido." }),
});

export async function sendInvite(partnerEmail: string) {
  'use server';

  const validation = InviteSchema.safeParse({ email: partnerEmail });
  if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
  }

  try {
      const fn = httpsCallable(functions, 'sendPartnerInvite');
      const res = await fn({ partnerEmail });
      const data = res.data as { success: boolean, message: string, error?: string };
      
      if (!data.success) {
        throw new Error(data.error || 'A Cloud Function retornou um erro.');
      }
      
      revalidatePath('/dashboard/couple');
      return { success: true, data: data.message };
  } catch (err: any) {
      console.error("Server Action 'sendInvite' error:", err);
      // Extrai a mensagem de erro do Firebase se disponível
      const errorMessage = err.details?.message || err.message || 'Erro desconhecido no servidor.';
      return { success: false, error: errorMessage };
  }
}


export async function acceptInvite(inviteId: string) {
  'use server';
  try {
    const fn = httpsCallable(functions, 'acceptPartnerInvite');
    const res = await fn({ inviteId });
    revalidatePath('/dashboard/couple');
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function rejectInvite(inviteId: string) {
  'use server';
  try {
    const fn = httpsCallable(functions, 'rejectPartnerInvite');
    const res = await fn({ inviteId });
    revalidatePath('/dashboard/couple');
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function cancelInvite(inviteId: string) {
  'use server';
  // Reutiliza a mesma cloud function, pois a lógica de backend é a mesma
  try {
    const fn = httpsCallable(functions, 'rejectPartnerInvite');
    const res = await fn({ inviteId });
    revalidatePath('/dashboard/couple');
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
