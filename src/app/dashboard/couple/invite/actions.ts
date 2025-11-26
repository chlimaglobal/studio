'use server';

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { z } from 'zod';

/**
 * Envia um convite para um parceiro.
 * Chama a Cloud Function 'sendPartnerInvite'.
 * @param partnerEmail - O email do parceiro a ser convidado.
 * @returns Objeto com status de sucesso, dados ou erro.
 */
export async function sendInvite(partnerEmail: string) {
  try {
    const fn = httpsCallable(functions, 'sendPartnerInvite');
    const res = await fn({ partnerEmail });
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Aceita um convite de parceria.
 * Chama a Cloud Function 'acceptPartnerInvite'.
 * @param inviteId - O ID do convite a ser aceito.
 * @returns Objeto com status de sucesso, dados ou erro.
 */
export async function acceptInvite(inviteId: string) {
  try {
    const fn = httpsCallable(functions, 'acceptPartnerInvite');
    const res = await fn({ inviteId });
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Rejeita um convite de parceria.
 * Chama a Cloud Function 'rejectPartnerInvite'.
 * @param inviteId - O ID do convite a ser rejeitado.
 * @returns Objeto com status de sucesso, dados ou erro.
 */
export async function rejectInvite(inviteId: string) {
  try {
    const fn = httpsCallable(functions, 'rejectPartnerInvite');
    const res = await fn({ inviteId });
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Cancela um convite de parceria enviado.
 * Chama a Cloud Function 'cancelPartnerInvite'.
 * @param inviteId - O ID do convite a ser cancelado.
 * @returns Objeto com status de sucesso, dados ou erro.
 */
export async function cancelInvite(inviteId: string) {
    // Nota: Reutiliza a função 'reject' do backend, pois a lógica é a mesma.
  try {
    const fn = httpsCallable(functions, 'rejectPartnerInvite');
    const res = await fn({ inviteId });
    return { success: true, data: res.data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
