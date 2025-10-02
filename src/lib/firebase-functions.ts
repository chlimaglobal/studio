// IMPORTANT: This file should be deployed as a Firebase Cloud Function.
// It is included here for completeness but needs to be deployed separately.
'use server';
import { adminDb } from './firebase-admin';
import { customAlphabet } from 'nanoid';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

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
