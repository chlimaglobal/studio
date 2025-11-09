
// IMPORTANT: This file should be deployed as a Firebase Cloud Function.
// It is included here for completeness but needs to be deployed separately.
import { adminDb, adminApp } from './firebase-admin';
import { customAlphabet } from 'nanoid';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { formatCurrency } from './utils';
import * as sgMail from '@sendgrid/mail';


/**
 * Triggers when a new user is created and sends a notification to the admin.
 * This is a Firebase Authentication Trigger.
 * @param {UserRecord} user - The user record of the new user.
 */
export async function onUserCreated(user: { email: string, displayName: string }) {
  if (!user.email) {
    console.error('New user created without an email address.');
    return;
  }
  
  try {
    // This functionality was removed as it's not being used.
    // await sendNewUserAdminNotification(user.email, user.displayName);
    console.log(`New user created: ${user.email}`);
  } catch (error) {
    console.error(`Failed to process new user creation for ${user.email}`, error);
  }
}

/**
 * Triggers when a new transaction is created and sends a push notification to the user.
 * This is a Firestore Trigger.
 * @param {string} userId - The ID of the user who created the transaction.
 * @param {object} transactionData - The data of the newly created transaction.
 */
export async function onTransactionCreated(
    userId: string, 
    transactionData: { type: 'income' | 'expense', amount: number, description: string }
) {
    if (!adminApp) {
        console.warn("Admin App not initialized, skipping notification.");
        return;
    }

    if (!userId || !transactionData) {
        console.log("Missing userId or transaction data, skipping notification.");
        return;
    }

    // 1. Get the user's document to find their FCM tokens
    const userDocRef = adminDb!.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
        console.log(`User document for ${userId} not found.`);
        return;
    }

    const userData = userDoc.data();
    const fcmTokens = userData?.fcmTokens;

    if (!fcmTokens || !Array.isArray(fcmTokens) || fcmTokens.length === 0) {
        console.log(`No FCM tokens found for user ${userId}.`);
        return;
    }

    // 2. Construct the notification message
    const { type, amount, description } = transactionData;
    const title = type === 'income' ? 'Nova Receita Registrada!' : 'Nova Despesa Registrada!';
    const body = `${description}: ${formatCurrency(amount)}`;

    const message = {
        notification: {
            title,
            body,
        },
        tokens: fcmTokens,
        webpush: {
            notification: {
                badge: '/icon-192x192.png',
                icon: '/icon-192x192.png',
            },
        },
    };

    // 3. Send the notification using FCM
    try {
        const response = await getMessaging(adminApp).sendEachForMulticast(message);
        console.log(`Successfully sent ${response.successCount} messages.`);
        
        // Optional: Clean up invalid tokens
        if (response.failureCount > 0) {
            const tokensToRemove: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    // https://firebase.google.com/docs/cloud-messaging/manage-tokens#detect-invalid-token-responses-from-the-fcm-backend
                    const errorCode = resp.error?.code;
                    if (errorCode === 'messaging/invalid-registration-token' ||
                        errorCode === 'messaging/registration-token-not-registered') {
                        tokensToRemove.push(fcmTokens[idx]);
                    }
                }
            });
            
            if (tokensToRemove.length > 0) {
                console.log('Removing invalid tokens:', tokensToRemove);
                await userDocRef.update({
                    fcmTokens: FieldValue.arrayRemove(...tokensToRemove)
                });
            }
        }
        
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}


/**
 * Generates a unique invite code for a shared account.
 * This is a Firebase Callable Function.
 * @param {object} data - The data passed from the client.
 * @param {string} data.accountId - The ID of the account to share.
 * @param {object} context - The authentication context.
 * @param {string} context.auth.uid - The UID of the authenticated user.
 * @returns {Promise<{success: boolean, code: string}>}
 */
export async function generateInviteCode(data: { accountId: string }, senderId: string) {
  if (!senderId) {
    throw new Error('Usuário não autenticado.');
  }

  if (!data.accountId) {
    throw new Error('ID da conta não fornecido.');
  }
  
  if (!adminDb) {
      throw new Error('O banco de dados do administrador não foi inicializado.');
  }

  const { accountId } = data;

  try {
    const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);
    const code = nanoid();
    const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    const inviteDocRef = adminDb.collection('invites').doc(code);
    await inviteDocRef.set({
      code,
      accountId,
      senderId,
      status: 'pending',
      expiresAt,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true, code: code };
  } catch (error) {
    console.error("Error in generateInviteCode function:", error);
    throw new Error('Não foi possível gerar o código de convite.');
  }
}

/**
 * Accepts an invite code and grants access to the shared account.
 * This is a Firebase Callable Function.
 * @param {object} data - The data passed from the client.
 * @param {string} data.code - The invite code.
 * @param {object} context - The authentication context.
 * @param {string} context.auth.uid - The UID of the authenticated user.
 * @returns {Promise<{success: boolean, accountName: string}>}
 */
export async function acceptInviteCode(data: { code: string }, acceptorId: string) {
  if (!acceptorId) {
    throw new Error('Usuário não autenticado.');
  }
  
  if (!data.code) {
      throw new Error('Código de convite não fornecido.');
  }
  
  if (!adminDb) {
      throw new Error('O banco de dados do administrador não foi inicializado.');
  }

  const { code } = data;
  const inviteDocRef = adminDb.collection('invites').doc(code);

  try {
    return await adminDb.runTransaction(async (transaction) => {
      const inviteDoc = await transaction.get(inviteDocRef);

      if (!inviteDoc.exists) {
        throw new Error("Código de convite inválido ou expirado.");
      }

      const inviteData = inviteDoc.data()!;
      if (inviteData.status !== 'pending' || inviteData.expiresAt.toMillis() < Date.now()) {
        throw new Error("Convite já utilizado ou expirado.");
      }
      if (inviteData.senderId === acceptorId) {
        throw new Error("Você não pode aceitar seu próprio convite.");
      }

      const accountRef = adminDb.collection('users').doc(inviteData.senderId).collection('accounts').doc(inviteData.accountId);
      const accountDoc = await transaction.get(accountRef);
      if (!accountDoc.exists) {
        throw new Error("A conta compartilhada não foi encontrada.");
      }
      const accountData = accountDoc.data();
      const accountName = accountData?.name || 'Conta Compartilhada';

      transaction.update(accountRef, {
        memberIds: FieldValue.arrayUnion(acceptorId),
        isShared: true,
      });

      const sharedAccountRef = adminDb.collection('users').doc(acceptorId).collection('sharedAccounts').doc(inviteData.accountId);
      transaction.set(sharedAccountRef, {
        accountRef: accountRef.path,
        ownerId: inviteData.senderId,
        addedAt: FieldValue.serverTimestamp(),
      });

      transaction.update(inviteDocRef, {
        status: 'accepted',
        acceptedBy: acceptorId,
        acceptedAt: FieldValue.serverTimestamp(),
      });

      return { success: true, accountName: accountName };
    });
  } catch (error) {
    console.error("Error in acceptInviteCode function:", error);
    const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
    throw new Error(errorMessage);
  }
}

/**
 * Sends an invitation email to a new dependent.
 * This is a Firebase Callable Function.
 */
export async function sendDependentInvite(data: { dependentName: string, dependentEmail: string }, context: { auth?: { uid: string, token: { name?: string } } }) {
    if (!context.auth) {
        throw new Error('Usuário não autenticado.');
    }
    const { dependentName, dependentEmail } = data;
    const parentUid = context.auth.uid;
    const parentName = context.auth.token.name || 'Um usuário';

    if (!adminDb) {
        throw new Error('O banco de dados do administrador não foi inicializado.');
    }

    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
        console.error("SENDGRID_API_KEY is not set.");
        throw new Error("O serviço de envio de e-mails não está configurado no servidor.");
    }
    sgMail.setApiKey(apiKey);

    const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 16);
    const inviteToken = nanoid();
    const inviteRef = adminDb.collection('dependentInvites').doc(inviteToken);

    await inviteRef.set({
        parentUid,
        parentName,
        dependentName,
        dependentEmail,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    const inviteLink = `https://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}/signup?invite=${inviteToken}`;
    
    const msg = {
        to: dependentEmail,
        from: 'financeflow-no-reply@yourdomain.com', // **IMPORTANTE: Use um e-mail verificado no SendGrid**
        subject: `Você foi convidado para o FinanceFlow por ${parentName}!`,
        html: `
            <h1>Olá ${dependentName},</h1>
            <p>${parentName} convidou você para usar o FinanceFlow e aprender a gerenciar suas finanças.</p>
            <p>Clique no link abaixo para criar sua conta:</p>
            <a href="${inviteLink}" style="background-color: #3F51B5; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Criar Minha Conta</a>
            <p>Se você não estava esperando este convite, pode ignorar este e-mail.</p>
            <br>
            <p>Atenciosamente,</p>
            <p>A Equipe FinanceFlow</p>
        `,
    };

    try {
        await sgMail.send(msg);
        return { success: true, message: `Um convite foi enviado para ${dependentEmail}.` };
    } catch (error) {
        console.error("Error sending email with SendGrid:", error);
        throw new Error("Não foi possível enviar o e-mail de convite.");
    }
}
