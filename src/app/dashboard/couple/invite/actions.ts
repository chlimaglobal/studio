
'use server';

import { z } from 'zod';
import { adminDb, adminApp } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { Timestamp } from 'firebase-admin/firestore';
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
