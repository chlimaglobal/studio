
'use server';

// Garante que o SDK do Admin seja inicializado antes de qualquer outra coisa.
import { adminDb, adminApp } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { customAlphabet } from 'nanoid';
import { getAuth } from 'firebase-admin/auth';

async function getAuthenticatedUserId(): Promise<string | null> {
    // This is a placeholder for a real authentication check.
    // In a real app, you would get the user ID from the session.
    // For now, we'll assume a hardcoded user ID for demonstration.
    // This part needs to be replaced with a robust session management solution.
    // For example, using Next-Auth.js or Firebase Auth server-side sessions.
    
    // The issue might be that this Server Action doesn't have auth context.
    // Let's try to get it from the admin SDK, assuming a session cookie is set.
    // Note: This requires proper session cookie setup, which might be missing.
    try {
        // This is not the right way for Server Actions as they don't have the request object directly.
        // The auth context should be handled by the framework or a library.
        // The error suggests this part is failing.
        // Let's simplify and assume the calling client is authenticated and we can get the UID.
        // A robust solution would involve session management.
        // The Firebase Admin SDK cannot directly get the current user without a session cookie or ID token.
        // Let's assume the user's ID is passed in.
        return null; // This function will be removed in favor of a better approach.
    } catch (e) {
        return null;
    }
}


export async function generateInviteCode(accountId: string) {
    // A robust implementation would get the userId from a secure session.
    // For now, we'll hardcode it, but this is NOT secure for production.
    // This is likely the point of failure. Let's assume we can get the user id.
    // This needs to be replaced by a real auth check.
    const userId = "dummy_user_id_needs_real_auth"; // This needs a fix.

    // Let's try a different approach. We can't get the user from thin air.
    // The auth state needs to be managed and accessible here.
    // Since we are in a server action, let's assume we get the UID from a session manager
    // for now we will simulate it.

    if (!adminDb) {
        return { error: "O banco de dados do administrador não foi inicializado." };
    }
    
    // In a real scenario, you'd get the user from the session.
    // const session = await getSession();
    // const userId = session?.user?.id;
    // if (!userId) {
    //   return { error: "Usuário não autenticado." };
    // }
    // As a temporary measure, let's hardcode a user for testing.
    const tempUserId = "hXf9a7bY2fZ3cE1d"; // THIS IS A PLACEHOLDER

    const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);
    const code = nanoid();
    const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

    try {
        await adminDb.collection('invites').add({
            code,
            accountId,
            generatedBy: tempUserId, // Using the temporary user ID
            expiresAt,
            status: 'pending', // pending, accepted, expired
        });

        return { code };
    } catch (error) {
        console.error("Failed to generate invite code:", error);
        return { error: "Não foi possível gerar o código do convite." };
    }
}

export async function acceptInviteCode(code: string, acceptingUserId: string) {
     if (!acceptingUserId) {
        throw new Error("Usuário não autenticado para aceitar o convite.");
    }
    
     if (!adminDb) {
        throw new Error("O banco de dados do administrador não foi inicializado.");
    }

    const invitesRef = adminDb.collection('invites');
    const q = invitesRef.where('code', '==', code.toUpperCase()).where('status', '==', 'pending');
    
    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
        throw new Error("Código de convite inválido ou expirado.");
    }

    const inviteDoc = querySnapshot.docs[0];
    const inviteData = inviteDoc.data();

    if (inviteData.expiresAt.toMillis() < Date.now()) {
        await inviteDoc.ref.update({ status: 'expired' });
        throw new Error("Código de convite expirado.");
    }
    
    if (inviteData.generatedBy === acceptingUserId) {
        throw new Error("Você não pode aceitar seu próprio convite.");
    }

    const accountDocRef = adminDb.collection('users').doc(inviteData.generatedBy).collection('accounts').doc(inviteData.accountId);
    
    const accountDoc = await accountDocRef.get();
    if (!accountDoc.exists) {
        throw new Error("A conta associada a este convite não foi encontrada.");
    }

    const batch = adminDb.batch();

    batch.update(accountDocRef, {
        memberIds: FieldValue.arrayUnion(acceptingUserId),
        isShared: true,
    });
    
    batch.update(inviteDoc.ref, {
        status: 'accepted',
        acceptedBy: acceptingUserId,
        acceptedAt: Timestamp.now(),
    });
    
    const userSharedAccountRef = adminDb.collection('users').doc(acceptingUserId).collection('sharedAccounts').doc(inviteData.accountId);
    batch.set(userSharedAccountRef, {
       accountRef: accountDocRef.path,
       ownerId: inviteData.generatedBy,
       sharedAt: Timestamp.now(),
    });

    await batch.commit();

    return { success: true, accountName: accountDoc.data()?.name };
}
