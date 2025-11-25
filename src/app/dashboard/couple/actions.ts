
'use server';

import { z } from 'zod';
import { adminDb, adminApp } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

// Zod Schemas
const InviteSchema = z.object({
  email: z.string().email('O e-mail fornecido é inválido.'),
});

const InviteActionSchema = z.object({
  inviteId: z.string().min(1, 'ID do convite é obrigatório.'),
});


// 1. sendPartnerInvite
export async function sendPartnerInvite(prevState: any, formData: FormData) {
  const headers = new Headers();
  const token = headers.get("Authorization")?.split("Bearer ")[1];
  
  const auth = getAuth(adminApp);
  const decodedToken = token ? await auth.verifyIdToken(token) : null;
  const uid = decodedToken?.uid;

  if (!uid) return { error: 'Usuário não autenticado.' };
  
  const userDoc = await adminDb.collection('users').doc(uid).get();
  const { email: currentUserEmail, displayName } = userDoc.data() as any;

  if (!adminDb || !adminApp) {
      return { error: 'Serviço indisponível. Tente novamente mais tarde.' };
  }

  const validatedFields = InviteSchema.safeParse({
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors.email?.[0] };
  }
  
  if (userDoc.data()?.coupleId) {
      return { error: 'Você já está vinculado a um parceiro.' };
  }

  const { email: partnerEmail } = validatedFields.data;

  if (partnerEmail === currentUserEmail) {
      return { error: 'Você não pode convidar a si mesmo.' };
  }

  try {
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
        sentToEmail: partnerEmail,
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
export async function acceptPartnerInvite(inviteId: string, userId: string) {
  const inviteRef = adminDb.collection("invites").doc(inviteId);
  const inviteSnap = await inviteRef.get();

  if (!inviteSnap.exists)
    throw new Error("Invite not found");

  const invite = inviteSnap.data()!;

  if (invite.sentTo !== userId)
    throw new Error("Not authorized to accept this invite");

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
    memberIds: [userId, partnerId],
  });

  batch.update(adminDb.collection("users").doc(partnerId), {
    coupleId,
    memberIds: [userId, partnerId],
  });

  batch.update(inviteRef, {
    status: "accepted"
  });

  const otherInvitesSnap = await adminDb.collection("invites")
    .where("sentTo", "==", userId).get();

  otherInvitesSnap.forEach(doc => {
    if (doc.id !== inviteId) batch.update(doc.ref, { status: "rejected" });
  });

  await batch.commit();

  return { success: true, coupleId };
}


// 3. rejectPartnerInvite
export async function rejectPartnerInvite(prevState: any, formData: FormData) {
    const headers = new Headers();
    const token = headers.get("Authorization")?.split("Bearer ")[1];
  
    const auth = getAuth(adminApp);
    const decodedToken = token ? await auth.verifyIdToken(token) : null;
  
    if (!decodedToken) return { error: 'Usuário não autenticado.' };
    
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
        await inviteRef.update({ status: 'rejected' });
        revalidatePath('/dashboard');
        return { success: 'Convite recusado.' };
    } catch (error) {
        console.error('Error rejecting invite:', error);
        return { error: 'Ocorreu um erro ao recusar o convite.' };
    }
}

// 4. disconnectPartner
export async function disconnectPartner(prevState: any, formData: FormData) {
    const headers = new Headers();
    const token = headers.get("Authorization")?.split("Bearer ")[1];
  
    const auth = getAuth(adminApp);
    const decodedToken = token ? await auth.verifyIdToken(token) : null;
    const uid = decodedToken?.uid;

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
    
    // Also reject any pending invites for these users
    const pendingSentInvites = await adminDb.collection('invites').where('sentBy', 'in', [uid, partnerId]).where('status', '==', 'pending').get();
    pendingSentInvites.forEach(doc => batch.update(doc.ref, { status: 'rejected' }));
    
    const pendingReceivedInvites = await adminDb.collection('invites').where('sentTo', 'in', [uid, partnerId]).where('status', '==', 'pending').get();
    pendingReceivedInvites.forEach(doc => batch.update(doc.ref, { status: 'rejected' }));

    try {
        await batch.commit();
        revalidatePath('/dashboard');
        return { success: 'Vínculo com o parceiro desfeito com sucesso.' };
    } catch (error) {
        console.error('Error disconnecting partner:', error);
        return { error: 'Ocorreu um erro ao desvincular.' };
    }
}
