
'use server';

import { z } from 'zod';
import { adminDb, adminApp } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import * as sgMail from '@sendgrid/mail';

// Initialize SendGrid
const sendGridApiKey = process.env.SENDGRID_API_KEY;
if (sendGridApiKey) {
    sgMail.setApiKey(sendGridApiKey);
} else {
    console.warn('SENDGRID_API_KEY is not set. Emails will not be sent.');
}

// Zod Schemas
const InviteSchema = z.object({
  email: z.string().email('O e-mail fornecido é inválido.'),
  userId: z.string().min(1, 'ID do usuário é obrigatório.'),
});

const InviteActionSchema = z.object({
    inviteId: z.string().min(1, 'ID do convite é obrigatório.'),
    userId: z.string().min(1, 'ID do usuário é obrigatório.'),
});


export async function sendPartnerInvite(prevState: any, formData: FormData) {
  const validatedFields = InviteSchema.safeParse({
    email: formData.get('email'),
    userId: formData.get('userId'),
  });

  if (!validatedFields.success) {
    return { error: 'Dados inválidos. Tente novamente.' };
  }
  const { email: partnerEmail, userId: uid } = validatedFields.data;

  if (!uid) return { error: 'Usuário não autenticado.' };
  
  if (!adminDb || !adminApp) {
      return { error: 'Serviço indisponível. Tente novamente mais tarde.' };
  }

  const userDoc = await adminDb.collection('users').doc(uid).get();
  if (!userDoc.exists) {
      return { error: 'Usuário remetente não encontrado.' };
  }
  const { email: currentUserEmail, displayName } = userDoc.data() as any;

  if (userDoc.data()?.coupleId) {
      return { error: 'Você já está vinculado a um parceiro.' };
  }

  if (partnerEmail === currentUserEmail) {
      return { error: 'Você não pode convidar a si mesmo.' };
  }

  const authAdmin = getAuth(adminApp);
  try {
    const partnerRecord = await authAdmin.getUserByEmail(partnerEmail);
    const partnerDoc = await adminDb.collection('users').doc(partnerRecord.uid).get();

    if (partnerDoc.exists && partnerDoc.data()?.coupleId) {
        return { error: 'Este usuário já está vinculado a outro parceiro.' };
    }
    
    const inviteRef = adminDb.collection('invites').doc();
    
    const inviteData = {
        inviteId: inviteRef.id,
        sentBy: uid,
        sentTo: partnerRecord.uid,
        sentToEmail: partnerEmail,
        sentByName: displayName,
        sentByEmail: currentUserEmail,
        createdAt: Timestamp.now(),
        status: 'pending' as const
    };

    await inviteRef.set(inviteData);
    
    // Send email notification
    if (sendGridApiKey) {
        const msg = {
            to: partnerEmail,
            from: 'financeflowsuporte@proton.me', // Use a verified sender
            subject: `${displayName} convidou você para o FinanceFlow!`,
            html: `
                <h1>Olá!</h1>
                <p><b>${displayName}</b> convidou você para conectar suas contas no FinanceFlow e gerenciar suas finanças em conjunto.</p>
                <p>Abra o aplicativo e você verá o convite pendente para aceitar.</p>
                <p>Se você não estava esperando este convite, pode ignorar este e-mail.</p>
                <br/>
                <p>Equipe FinanceFlow</p>
            `,
        };
        try {
            await sgMail.send(msg);
        } catch (emailError) {
             console.error("SendGrid Error:", emailError);
             // Don't fail the whole operation if email fails, but log it.
        }
    }
    
    revalidatePath('/dashboard/couple');
    return { success: `Convite enviado para ${partnerEmail}.` };

  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
        return { error: 'Nenhum usuário encontrado com este e-mail. Peça para seu parceiro(a) criar uma conta primeiro.' };
    }
    console.error('Error sending invite:', error);
    return { error: 'Ocorreu um erro ao enviar o convite. Tente novamente.' };
  }
}

export async function disconnectPartner(prevState: any, formData: FormData) {
  const userId = formData.get('userId') as string;
  if (!userId) return { error: 'Usuário não autenticado.' };

  if (!adminDb) return { error: 'Serviço indisponível. Tente novamente mais tarde.' };
  
  try {
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const coupleId = userDoc.data()?.coupleId;

    if (!coupleId) {
      return { error: 'Você não está vinculado a um parceiro.' };
    }

    const coupleRef = adminDb.collection('couples').doc(coupleId);
    const coupleDoc = await coupleRef.get();
    
    if (!coupleDoc.exists) {
       // Data inconsistency, but we can still clean up the user.
       await userRef.update({ coupleId: FieldValue.delete() });
       return { success: 'Vínculo removido (relação de casal não encontrada).' };
    }
    
    const partnerId = coupleDoc.data()?.members.find((id: string) => id !== userId);
    
    const batch = adminDb.batch();

    // Remove coupleId from both users
    batch.update(userRef, { coupleId: FieldValue.delete() });
    if (partnerId) {
       const partnerRef = adminDb.collection('users').doc(partnerId);
       batch.update(partnerRef, { coupleId: FieldValue.delete() });
    }

    // Delete the couple document
    batch.delete(coupleRef);

    await batch.commit();
    revalidatePath('/dashboard/couple');
    return { success: 'Vínculo com o parceiro(a) foi removido com sucesso.' };

  } catch (error) {
    console.error('Error disconnecting partner:', error);
    return { error: 'Ocorreu um erro ao desvincular as contas.' };
  }
}

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


export async function rejectPartnerInvite(prevState: any, formData: FormData) {
    const validatedFields = InviteActionSchema.safeParse({
        inviteId: formData.get('inviteId'),
        userId: formData.get('userId'),
    });

    if (!validatedFields.success) {
        return { error: 'Dados inválidos.' };
    }
    
    if (!adminDb) return { error: 'Serviço indisponível. Tente novamente mais tarde.' };

    const { inviteId, userId } = validatedFields.data;
    const inviteRef = adminDb.collection('invites').doc(inviteId);
    
    const inviteDoc = await inviteRef.get();
    if (!inviteDoc.exists) return { error: 'Convite não encontrado.' };
    
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
