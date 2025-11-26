'use server';

import { z } from 'zod';
import { adminDb, adminApp } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

/**
 * Nota:
 * - Não importamos @sendgrid/mail no topo do arquivo para evitar erros de
 *   inicialização em ambientes onde a lib depende de runtime específico.
 *   Usamos import() dinâmico dentro de sendPartnerInvite.
 */

// ------------------------------
// Schemas
// ------------------------------
const SendInviteSchema = z.object({
  email: z.string().email(),
  userId: z.string().min(1),
});

const InviteActionSchema = z.object({
  inviteId: z.string().min(1),
  userId: z.string().min(1),
});

// ------------------------------
// Helpers
// ------------------------------
async function getUserData(uid: string) {
  const doc = await adminDb.collection('users').doc(uid).get();
  if (!doc.exists) throw new Error('Usuário não encontrado');
  return doc.data();
}

// ------------------------------
// SEND INVITE (server action)
// - cria um doc em 'invites' com status = 'pending' e tenta enviar email
// ------------------------------
export async function sendPartnerInvite(formData: FormData) {
  const parsed = SendInviteSchema.safeParse({
    email: formData.get('email'),
    userId: formData.get('userId'),
  });

  if (!parsed.success) {
    return { error: 'Dados inválidos. Verifique o email e tente novamente.' };
  }

  const { email: partnerEmail, userId: senderUid } = parsed.data;

  // valida existência de serviços
  if (!adminDb || !adminApp) {
    return { error: 'Serviço indisponível. Tente novamente mais tarde.' };
  }

  // busca remetente
  const senderDoc = await adminDb.collection('users').doc(senderUid).get();
  if (!senderDoc.exists) return { error: 'Usuário remetente não encontrado.' };
  const senderData = senderDoc.data() as any;

  // não permitir convidar a si mesmo
  if (senderData.email === partnerEmail) {
    return { error: 'Você não pode convidar o próprio e-mail.' };
  }

  // verifica se partner existe no Auth
  try {
    const authAdmin = getAuth(adminApp);
    const partnerRecord = await authAdmin.getUserByEmail(partnerEmail).catch(() => null);

    // se partner existe, checar se já tem couple
    if (partnerRecord) {
      const partnerDoc = await adminDb.collection('users').doc(partnerRecord.uid).get();
      if (partnerDoc.exists && partnerDoc.data()?.coupleId) {
        return { error: 'Este usuário já está vinculado a outro parceiro.' };
      }
    }

    // cria invite doc
    const inviteRef = adminDb.collection('invites').doc();
    const inviteData = {
      inviteId: inviteRef.id,
      sentBy: senderUid,
      sentToEmail: partnerEmail,
      sentByName: senderData.displayName || senderData.name || null,
      sentByEmail: senderData.email || null,
      createdAt: Timestamp.now(),
      status: 'pending',
      // sentTo can be filled if partner exists in Auth:
      sentTo: partnerRecord ? partnerRecord.uid : null,
    };
    await inviteRef.set(inviteData);

    // tentar enviar email via SendGrid (dinâmico)
    try {
      const sendGridApiKey = process.env.SENDGRID_API_KEY;
      if (sendGridApiKey) {
        const sgMailModule = await import('@sendgrid/mail');
        const sgMail = sgMailModule.default ?? sgMailModule;
        sgMail.setApiKey(sendGridApiKey);

        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard/couple/invite`;
        const msg = {
          to: partnerEmail,
          from: process.env.SENDGRID_FROM || 'financeflowsuporte@proton.me',
          subject: `${inviteData.sentByName || 'Alguém'} convidou você para o FinanceFlow`,
          html: `
            <p><b>${inviteData.sentByName || 'Alguém'}</b> convidou você para conectar suas contas no FinanceFlow.</p>
            <p>Acesse o app e você verá o convite pendente para aceitar.</p>
            <p><a href="${inviteLink}">Abrir FinanceFlow</a></p>
          `,
        };
        await sgMail.send(msg);
      } else {
        console.warn('SENDGRID_API_KEY não está definida — email não enviado.');
      }
    } catch (sgError) {
      console.error('SendGrid error (não falha ação):', sgError);
      // não falhar a criação do invite por causa do email
    }

    revalidatePath('/dashboard/couple');
    return { success: `Convite enviado para ${partnerEmail}.` };
  } catch (err: any) {
    console.error('sendPartnerInvite error:', err);
    return { error: 'Ocorreu um erro ao enviar o convite.' };
  }
}

// ------------------------------
// ACCEPT INVITE
// - aceita o inviteId, cria couples doc, atualiza users.coupleId e memberIds
// - aceita tanto um FormData (server action) quanto parâmetros simples
// ------------------------------
export async function acceptPartnerInvite(arg: FormData | { inviteId: string; userId?: string }) {
  // normalize input
  let inviteId: string | undefined;
  let actingUserId: string | undefined;

  if (arg instanceof FormData) {
    inviteId = String(arg.get('inviteId') || '');
    actingUserId = String(arg.get('userId') || '');
  } else {
    inviteId = arg.inviteId;
    actingUserId = arg.userId;
  }

  if (!inviteId) return { success: false, error: 'inviteId é obrigatório.' };

  try {
    const inviteRef = adminDb.collection('invites').doc(inviteId);
    const inviteSnap = await inviteRef.get();
    if (!inviteSnap.exists) return { success: false, error: 'Convite não encontrado.' };
    const invite = inviteSnap.data() as any;

    // se invite.sentTo existe (uid) validamos actingUser é o sentTo.
    if (invite.sentTo && actingUserId && invite.sentTo !== actingUserId) {
      return { success: false, error: 'Você não pode aceitar este convite.' };
    }

    // determinar os dois uids
    const sentBy: string = invite.sentBy;
    const sentTo: string = invite.sentTo || actingUserId; // se invite foi enviado por email e não existe uid, actingUserId deve ser passado

    if (!sentBy || !sentTo) {
      return { success: false, error: 'Convite incompleto (sem destinatário ou remetente).' };
    }

    // criar couple
    const coupleRef = adminDb.collection('couples').doc();
    const coupleId = coupleRef.id;

    const batch = adminDb.batch();

    batch.set(coupleRef, {
      id: coupleId,
      members: [sentBy, sentTo],
      createdAt: Timestamp.now(),
    });

    // atualiza users
    const userRefA = adminDb.collection('users').doc(sentBy);
    const userRefB = adminDb.collection('users').doc(sentTo);

    batch.update(userRefA, {
      coupleId,
      memberIds: FieldValue.arrayUnion(sentTo),
      updatedAt: Timestamp.now(),
    });

    batch.update(userRefB, {
      coupleId,
      memberIds: FieldValue.arrayUnion(sentBy),
      updatedAt: Timestamp.now(),
    });

    // marca invite como accepted
    batch.update(inviteRef, { status: 'accepted', acceptedAt: Timestamp.now() });

    // rejeitar outros invites pendentes para esse usuário
    const otherInvites = await adminDb.collection('invites')
      .where('sentTo', '==', sentTo)
      .where('status', '==', 'pending')
      .get();

    otherInvites.forEach(doc => {
      if (doc.id !== inviteId) batch.update(doc.ref, { status: 'rejected' });
    });

    await batch.commit();

    revalidatePath('/dashboard/couple');
    return { success: true, coupleId };
  } catch (error: any) {
    console.error('acceptPartnerInvite error:', error);
    return { success: false, error: 'Erro ao aceitar convite.' };
  }
}

// ------------------------------
// REJECT INVITE
// ------------------------------
export async function rejectPartnerInvite(formData: FormData) {
  const parsed = InviteActionSchema.safeParse({
    inviteId: formData.get('inviteId'),
    userId: formData.get('userId'),
  });

  if (!parsed.success) return { success: false, error: 'Dados inválidos.' };

  const { inviteId, userId } = parsed.data;

  try {
    const inviteRef = adminDb.collection('invites').doc(inviteId);
    const inviteSnap = await inviteRef.get();
    if (!inviteSnap.exists) return { success: false, error: 'Convite não encontrado.' };

    const invite = inviteSnap.data() as any;
    // garantir permissão: quem pode rejeitar? o sentTo ou o sentBy
    if (invite.sentTo !== userId && invite.sentBy !== userId) {
      return { success: false, error: 'Você não tem permissão para essa ação.' };
    }

    await inviteRef.update({ status: 'rejected', rejectedAt: Timestamp.now() });
    revalidatePath('/dashboard/couple');
    return { success: true, message: 'Convite recusado/cancelado.' };
  } catch (error: any) {
    console.error('rejectPartnerInvite error:', error);
    return { success: false, error: 'Erro ao recusar convite.' };
  }
}

// ------------------------------
// DISCONNECT / UNLINK PARTNER
// ------------------------------
export async function disconnectPartner(formData: FormData) {
  // form expects userId (quem está pedindo desconectar)
  const userId = String(formData.get('userId') || '');
  if (!userId) return { success: false, error: 'Usuário não autenticado.' };

  try {
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const coupleId = userDoc.data()?.coupleId;
    if (!coupleId) {
      return { success: false, error: 'Você não está vinculado a um parceiro.' };
    }

    const coupleRef = adminDb.collection('couples').doc(coupleId);
    const coupleDoc = await coupleRef.get();

    const batch = adminDb.batch();
    batch.update(userRef, { coupleId: FieldValue.delete(), updatedAt: Timestamp.now() });

    if (coupleDoc.exists) {
      const partnerId = (coupleDoc.data()?.members || []).find((id: string) => id !== userId);
      if (partnerId) {
        batch.update(adminDb.collection('users').doc(partnerId), {
          coupleId: FieldValue.delete(),
          updatedAt: Timestamp.now(),
        });
      }
      batch.delete(coupleRef);
    }

    await batch.commit();
    revalidatePath('/dashboard/couple');
    return { success: true };
  } catch (error: any) {
    console.error('disconnectPartner error:', error);
    return { success: false, error: 'Erro ao desvincular parceiro.' };
  }
}