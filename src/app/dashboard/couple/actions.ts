
'use server';

import { z } from 'zod';
import { adminApp, adminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { auth as clientAuth } from '@/lib/firebase'; // Use client auth for current user

// Zod Schemas
const InviteSchema = z.object({
  email: z.string().email('O e-mail fornecido é inválido.'),
});

const InviteActionSchema = z.object({
  inviteId: z.string().min(1, 'ID do convite é obrigatório.'),
});


// Helper function to get the current user from the session
async function getCurrentUser(uid: string) {
    if (!uid) return null;
    if (!adminDb) return null;
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) return null;
    return { uid, ...userDoc.data() };
}

// 1. sendPartnerInvite
export async function sendPartnerInvite(prevState: any, formData: FormData) {
  const currentUserFromClient = clientAuth.currentUser;
  if (!currentUserFromClient) return { error: 'Usuário não autenticado.' };
  
  const { uid, email: currentUserEmail, displayName } = currentUserFromClient;

  if (!adminDb || !adminApp) {
      return { error: 'Serviço indisponível. Tente novamente mais tarde.' };
  }

  const validatedFields = InviteSchema.safeParse({
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors.email?.[0] };
  }
  
  const currentUserData = await getCurrentUser(uid);
  if (currentUserData?.coupleId) {
      return { error: 'Você já está vinculado a um parceiro.' };
  }

  const { email: partnerEmail } = validatedFields.data;

  if (partnerEmail === currentUserEmail) {
      return { error: 'Você não pode convidar a si mesmo.' };
  }

  try {
    const auth = getAuth(adminApp);
    const partnerRecord = await auth.getUserByEmail(partnerEmail);
    const partnerDoc = await adminDb.collection('users').doc(partnerRecord.uid).get();

    if (partnerDoc.exists && partnerDoc.data()?.coupleId) {
        return { error: 'Este usuário já está vinculado a outro parceiro.' };
    }
    
    // Create invite document
    const inviteRef = adminDb.collection('invites').doc();
    
    const inviteData = {
        inviteId: inviteRef.id,
        sentBy: uid,
        sentTo: partnerRecord.uid,
        sentByName: displayName,
        sentByEmail: currentUserEmail,
        createdAt: Timestamp.now(),
        status: 'pending'
    };

    await inviteRef.set(inviteData);
    
    revalidatePath('/dashboard');
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
    const currentUserFromClient = clientAuth.currentUser;
    if (!currentUserFromClient) return { error: 'Usuário não autenticado.' };
    const inviteeUid = currentUserFromClient.uid;

    if (!adminDb) return { error: 'Serviço indisponível. Tente novamente mais tarde.' };

    const validatedFields = InviteActionSchema.safeParse({
        inviteId: formData.get('inviteId'),
    });

    if (!validatedFields.success) {
        return { error: 'ID do convite inválido.' };
    }
    
    const { inviteId } = validatedFields.data;
    const inviteRef = adminDb.collection('invites').doc(inviteId);
    
    const batch = adminDb.batch();

    try {
        const inviteDoc = await inviteRef.get();
        if (!inviteDoc.exists || inviteDoc.data()?.status !== 'pending' || inviteDoc.data()?.sentTo !== inviteeUid) {
            return { error: 'Convite inválido ou expirado.' };
        }

        const inviteData = inviteDoc.data()!;
        const inviterUid = inviteData.sentBy;

        // Create global couple link
        const coupleLinkRef = adminDb.collection('coupleLinks').doc();
        batch.set(coupleLinkRef, {
            userA: inviterUid,
            userB: inviteeUid,
            createdAt: Timestamp.now(),
            status: 'active'
        });

        // Link users
        const inviterRef = adminDb.collection('users').doc(inviterUid);
        const inviteeRef = adminDb.collection('users').doc(inviteeUid);

        batch.update(inviterRef, { coupleId: coupleLinkRef.id });
        batch.update(inviteeRef, { coupleId: coupleLinkRef.id });

        // Update invite status to 'accepted'
        batch.update(inviteRef, { status: 'accepted', acceptedAt: Timestamp.now() });

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
    const currentUserFromClient = clientAuth.currentUser;
    if (!currentUserFromClient) return { error: 'Usuário não autenticado.' };
    
    if (!adminDb) return { error: 'Serviço indisponível. Tente novamente mais tarde.' };

     const validatedFields = InviteActionSchema.safeParse({
        inviteId: formData.get('inviteId'),
    });

    if (!validatedFields.success) {
        return { error: 'ID do convite inválido.' };
    }

    const { inviteId } = validatedFields.data;
    const inviteRef = adminDb.collection('invites').doc(inviteId);

    try {
        // Can be a soft delete (update status) or hard delete
        await inviteRef.delete();
        revalidatePath('/dashboard');
        return { success: 'Convite recusado.' };
    } catch (error) {
        console.error('Error rejecting invite:', error);
        return { error: 'Ocorreu um erro ao recusar o convite.' };
    }
}

// 4. disconnectPartner
export async function disconnectPartner(prevState: any, formData: FormData) {
    const currentUserFromClient = clientAuth.currentUser;
    if (!currentUserFromClient) return { error: 'Usuário não autenticado.' };
    const { uid } = currentUserFromClient;

    if (!adminDb) return { error: 'Serviço indisponível. Tente novamente mais tarde.' };

    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData?.coupleId) {
        return { error: 'Nenhum parceiro vinculado encontrado.' };
    }
    
    const coupleId = userData.coupleId;

    const coupleLinkRef = adminDb.collection('coupleLinks').doc(coupleId);
    const coupleLinkDoc = await coupleLinkRef.get();

    if (!coupleLinkDoc.exists) {
         // Data inconsistency, clean up user's coupleId anyway
         await userRef.update({ coupleId: FieldValue.delete() });
         return { error: 'Vínculo do casal não encontrado, mas sua conta foi limpa.' };
    }

    const { userA, userB } = coupleLinkDoc.data()!;
    const partnerId = uid === userA ? userB : userA;
    const partnerRef = adminDb.collection('users').doc(partnerId);

    const batch = adminDb.batch();
    batch.update(userRef, { coupleId: FieldValue.delete() });
    batch.update(partnerRef, { coupleId: FieldValue.delete() });
    batch.delete(coupleLinkRef);
    
    try {
        await batch.commit();
        revalidatePath('/dashboard');
        return { success: 'Vínculo com o parceiro desfeito com sucesso.' };
    } catch (error) {
        console.error('Error disconnecting partner:', error);
        return { error: 'Ocorreu um erro ao desvincular.' };
    }
}
