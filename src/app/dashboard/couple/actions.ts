
'use server';

import { z } from 'zod';
import { adminDb, adminApp } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import * as sgMail from '@sendgrid/mail';
import { headers } from 'next/headers';
import { auth } from 'firebase-admin';

// Initialize SendGrid
const sendGridApiKey = process.env.SENDGRID_API_KEY;
if (sendGridApiKey) {
    sgMail.setApiKey(sendGridApiKey);
} else {
    console.warn('SENDGRID_API_KEY is not set. Emails will not be sent.');
}


// Helper to get authenticated user from the token passed in headers
async function getAuthenticatedUser() {
  const authorization = headers().get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    console.log('Authorization header missing or invalid.');
    return null;
  }
  const token = authorization.split('Bearer ')[1];
  
  if (!adminApp) {
      console.error('Firebase Admin App not initialized in getAuthenticatedUser.');
      return null;
  }
  
  const authAdmin = getAuth(adminApp);
  try {
      return await authAdmin.verifyIdToken(token);
  } catch (error) {
      console.error('Error verifying auth token in Server Action:', error);
      return null;
  }
}


// Zod Schemas
const InviteActionSchema = z.object({
  inviteId: z.string().min(1, 'ID do convite é obrigatório.'),
});


// 2. acceptPartnerInvite
export async function acceptPartnerInvite(inviteId: string, userId: string) {
  if (!adminDb) throw new Error("Database not initialized.");

  const inviteRef = adminDb.collection("invites").doc(inviteId);
  const inviteSnap = await inviteRef.get();

  if (!inviteSnap.exists)
    throw new Error("Convite não encontrado.");

  const invite = inviteSnap.data()!;

  if (invite.sentTo !== userId)
    throw new Error("Não autorizado para aceitar este convite.");

  const partnerId = invite.sentBy;

  const coupleRef = adminDb.collection("couples").doc();
  const coupleId = coupleRef.id;
  
  const batch = adminDb.batch();

  batch.set(coupleRef, {
    id: coupleId,
    members: [userId, partnerId],
    createdAt: Timestamp.now(),
  });

  batch.update(adminDb.collection("users").doc(userId), {
    coupleId,
    memberIds: FieldValue.arrayUnion(partnerId),
  });

  batch.update(adminDb.collection("users").doc(partnerId), {
    coupleId,
    memberIds: FieldValue.arrayUnion(userId),
  });

  batch.update(inviteRef, {
    status: "accepted"
  });

  const otherInvitesSnap = await adminDb.collection("invites")
    .where("sentTo", "==", userId).where('status', '==', 'pending').get();

  otherInvitesSnap.forEach(doc => {
    if (doc.id !== inviteId) batch.update(doc.ref, { status: "rejected" });
  });

  await batch.commit();

  return { success: true, coupleId };
}


// 3. rejectPartnerInvite (also used for canceling)
export async function rejectPartnerInvite(prevState: any, formData: FormData) {
    const userId = formData.get('userId') as string;
    if (!userId) return { error: 'Usuário não autenticado.' };
    
    if (!adminDb) return { error: 'Serviço indisponível. Tente novamente mais tarde.' };

     const validatedFields = InviteActionSchema.safeParse({
        inviteId: formData.get('inviteId'),
    });

    if (!validatedFields.success) {
        return { error: 'ID do convite inválido.' };
    }

    const { inviteId } = validatedFields.data;
    const inviteRef = adminDb.collection('invites').doc(inviteId);
    
    const inviteDoc = await inviteRef.get();
    if (!inviteDoc.exists) return { error: 'Convite não encontrado.' };
    
    // Security check: ensure the user rejecting is either the sender or receiver
    const inviteData = inviteDoc.data()!;
    if (userId !== inviteData.sentBy && userId !== inviteData.sentTo) {
        return { error: 'Você não tem permissão para esta ação.' };
    }

    try {
        await inviteRef.update({ status: 'rejected' });
        revalidatePath('/dashboard/couple'); 
        return { success: 'Convite recusado/cancelado.' };
    } catch (error) {
        console.error('Error rejecting invite:', error);
        return { error: 'Ocorreu um erro ao recusar o convite.' };
    }
}

// 4. disconnectPartner
export async function disconnectPartner(prevState: any, formData: FormData) {
    const uid = formData.get('userId') as string;
    if (!uid) return { error: 'Usuário não autenticado.' };

    if (!adminDb) return { error: 'Serviço indisponível. Tente novamente mais tarde.' };

    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData?.coupleId) {
        return { error: 'Nenhum parceiro vinculado encontrado.' };
    }
    
    const coupleId = userData.coupleId;
    const coupleRef = adminDb.collection('couples').doc(coupleId);
    const coupleDoc = await coupleRef.get();

    if (!coupleDoc.exists) {
         await userRef.update({ 
           coupleId: FieldValue.delete(), 
           memberIds: [uid] 
         });
         return { error: 'Vínculo do casal não encontrado, mas sua conta foi limpa.' };
    }

    const { members } = coupleDoc.data()!;
    const partnerId = members.find((id: string) => id !== uid);
    
    const batch = adminDb.batch();

    batch.update(userRef, { 
      coupleId: FieldValue.delete(), 
      memberIds: [uid] 
    });

    if (partnerId) {
      const partnerRef = adminDb.collection('users').doc(partnerId);
      batch.update(partnerRef, { 
        coupleId: FieldValue.delete(), 
        memberIds: [partnerId] 
      });
    }

    batch.delete(coupleRef);
    
    const allMemberIds = [uid, partnerId].filter(Boolean);
    if(allMemberIds.length > 0) {
      const pendingSentInvites = await adminDb.collection('invites').where('sentBy', 'in', allMemberIds).where('status', '==', 'pending').get();
      pendingSentInvites.forEach(doc => batch.update(doc.ref, { status: 'rejected' }));
      
      const pendingReceivedInvites = await adminDb.collection('invites').where('sentTo', 'in', allMemberIds).where('status', '==', 'pending').get();
      pendingReceivedInvites.forEach(doc => batch.update(doc.ref, { status: 'rejected' }));
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
