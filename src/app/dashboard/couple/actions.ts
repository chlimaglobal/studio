'use server';

import { z } from 'zod';
import { getAuth } from 'firebase-admin/auth';
import { adminApp, adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

const auth = getAuth(adminApp);

// Zod Schemas for validation
const InviteSchema = z.object({
  email: z.string().email('O e-mail fornecido é inválido.'),
});

const InviteActionSchema = z.object({
  inviteId: z.string().min(1, 'ID do convite é obrigatório.'),
});

// Helper function to get the current user from the session
async function getCurrentUser(uid: string) {
    if (!uid) return null;
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) return null;
    return { uid, ...userDoc.data() };
}

// 1. sendPartnerInvite
export async function sendPartnerInvite(prevState: any, formData: FormData) {
  const { uid } = auth.currentUser || {};
  if (!uid) return { error: 'Usuário não autenticado.' };

  const validatedFields = InviteSchema.safeParse({
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors.email?.[0] };
  }
  
  const currentUser = await getCurrentUser(uid);
  if (currentUser?.coupleId) {
      return { error: 'Você já está vinculado a um parceiro.' };
  }

  const { email: partnerEmail } = validatedFields.data;

  if (partnerEmail === currentUser.email) {
      return { error: 'Você não pode convidar a si mesmo.' };
  }

  try {
    const partnerRecord = await auth.getUserByEmail(partnerEmail);
    const partnerDoc = await adminDb.collection('users').doc(partnerRecord.uid).get();

    if (partnerDoc.exists && partnerDoc.data()?.coupleId) {
        return { error: 'Este usuário já está vinculado a outro parceiro.' };
    }
    
    // Create invite document for the inviter
    const inviteRefUserA = adminDb.collection('users').doc(uid).collection('couple').doc('invite');
    const inviteId = inviteRefUserA.id;
    
    // Create invite document for the invitee
    const inviteRefUserB = adminDb.collection('users').doc(partnerRecord.uid).collection('couple').doc('invite');
    
    const inviteData = {
        inviteId,
        sentBy: uid,
        sentTo: partnerRecord.uid,
        sentToEmail: partnerEmail,
        sentByName: currentUser.displayName,
        sentByEmail: currentUser.email,
        createdAt: Timestamp.now(),
        status: 'pending'
    };

    const batch = adminDb.batch();
    batch.set(inviteRefUserA, inviteData);
    batch.set(inviteRefUserB, inviteData);
    await batch.commit();

    return { success: `Convite enviado para ${partnerEmail}.` };
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
        return { error: 'Nenhum usuário encontrado com este e-mail.' };
    }
    console.error('Error sending invite:', error);
    return { error: 'Ocorreu um erro ao enviar o convite. Tente novamente.' };
  }
}


// 2. acceptPartnerInvite
export async function acceptPartnerInvite(prevState: any, formData: FormData) {
    const { uid } = auth.currentUser || {};
    if (!uid) return { error: 'Usuário não autenticado.' };

    const validatedFields = InviteActionSchema.safeParse({
        inviteId: formData.get('inviteId'),
    });

    if (!validatedFields.success) {
        return { error: 'ID do convite inválido.' };
    }
    
    const { inviteId } = validatedFields.data;
    const inviteRef = adminDb.collection('users').doc(uid).collection('couple').doc('invite');
    
    const batch = adminDb.batch();

    try {
        const inviteDoc = await inviteRef.get();
        if (!inviteDoc.exists || inviteDoc.id !== inviteId) {
            return { error: 'Convite inválido ou expirado.' };
        }

        const inviteData = inviteDoc.data()!;
        const inviterId = inviteData.sentBy;

        // Create global couple link
        const coupleLinkRef = adminDb.collection('coupleLinks').doc();
        batch.set(coupleLinkRef, {
            userA: inviterId,
            userB: uid,
            createdAt: Timestamp.now(),
            status: 'active'
        });

        // Link users
        const inviterRef = adminDb.collection('users').doc(inviterId);
        const inviteeRef = adminDb.collection('users').doc(uid);

        const inviterData = (await inviterRef.get()).data()!;
        const inviteeData = (await inviteeRef.get()).data()!;
        
        // Create partner sub-document for inviter
        batch.set(inviterRef.collection('couple').doc('partner'), {
            uid: uid,
            name: inviteeData.displayName,
            email: inviteeData.email,
            photoURL: inviteeData.photoURL || '',
            coupleId: coupleLinkRef.id,
        });

        // Create partner sub-document for invitee
        batch.set(inviteeRef.collection('couple').doc('partner'), {
            uid: inviterId,
            name: inviterData.displayName,
            email: inviterData.email,
            photoURL: inviterData.photoURL || '',
            coupleId: coupleLinkRef.id,
        });

        // Delete invites
        batch.delete(inviteRef);
        batch.delete(adminDb.collection('users').doc(inviterId).collection('couple').doc('invite'));

        await batch.commit();

        revalidatePath('/dashboard');
        return { success: 'Parceiro vinculado com sucesso!' };

    } catch (error) {
        console.error('Error accepting invite:', error);
        return { error: 'Ocorreu um erro ao aceitar o convite.' };
    }
}

// 3. rejectPartnerInvite
export async function rejectPartnerInvite(prevState: any, formData: FormData) {
    const { uid } = auth.currentUser || {};
    if (!uid) return { error: 'Usuário não autenticado.' };

    const inviteRef = adminDb.collection('users').doc(uid).collection('couple').doc('invite');
    const inviteDoc = await inviteRef.get();

    if (!inviteDoc.exists) {
        return { error: 'Nenhum convite encontrado.' };
    }

    const inviterId = inviteDoc.data()!.sentBy;
    const inviterInviteRef = adminDb.collection('users').doc(inviterId).collection('couple').doc('invite');

    const batch = adminDb.batch();
    batch.delete(inviteRef);
    batch.delete(inviterInviteRef);

    try {
        await batch.commit();
        revalidatePath('/dashboard');
        return { success: 'Convite recusado.' };
    } catch (error) {
        console.error('Error rejecting invite:', error);
        return { error: 'Ocorreu um erro ao recusar o convite.' };
    }
}

// 4. checkPartnerStatus (This is handled client-side by the Zustand store listener)
// No server action needed for this, but could be implemented for a manual refresh.

// 5. disconnectPartner
export async function disconnectPartner(prevState: any, formData: FormData) {
    const { uid } = auth.currentUser || {};
    if (!uid) return { error: 'Usuário não autenticado.' };

    const partnerRef = adminDb.collection('users').doc(uid).collection('couple').doc('partner');
    const partnerDoc = await partnerRef.get();

    if (!partnerDoc.exists) {
        return { error: 'Nenhum parceiro vinculado encontrado.' };
    }

    const { coupleId, uid: partnerId } = partnerDoc.data() as { coupleId: string; uid: string };
    const partnerPartnerRef = adminDb.collection('users').doc(partnerId).collection('couple').doc('partner');
    
    const batch = adminDb.batch();
    batch.delete(partnerRef);
    batch.delete(partnerPartnerRef);

    if (coupleId) {
        const coupleLinkRef = adminDb.collection('coupleLinks').doc(coupleId);
        batch.delete(coupleLinkRef);
    }
    
    try {
        await batch.commit();
        revalidatePath('/dashboard');
        return { success: 'Vínculo com o parceiro desfeito com sucesso.' };
    } catch (error) {
        console.error('Error disconnecting partner:', error);
        return { error: 'Ocorreu um erro ao desvincular.' };
    }
}
