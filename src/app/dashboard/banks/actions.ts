
'use server';

// Garante que o SDK do Admin seja inicializado antes de qualquer outra coisa.
import { adminDb, adminApp } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { customAlphabet } from 'nanoid';
import { getAuth } from 'firebase-admin/auth';
import { headers } from 'next/headers';


async function getAuthenticatedUser(token: string) {
    const auth = getAuth(adminApp);
    try {
        if (!token) {
             console.error('Authorization token missing');
             return null;
        }
        const decodedToken = await auth.verifyIdToken(token);
        return {
            uid: decodedToken.uid,
            email: decodedToken.email,
            displayName: decodedToken.name,
        };
    } catch (error) {
        console.error('Error verifying auth token in Server Action:', error);
        return null;
    }
}


export async function generateInviteCode(accountId: string) {
    const idToken = headers().get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
        throw new Error("Token de autenticação não fornecido.");
    }
    
    const user = await getAuthenticatedUser(idToken);
    if (!user) {
        throw new Error("Usuário não autenticado.");
    }
    
    if (!adminDb) {
        throw new Error("O banco de dados do administrador não foi inicializado.");
    }

    const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);
    const code = nanoid();
    const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

    try {
        await adminDb.collection('invites').add({
            code,
            accountId,
            generatedBy: user.uid,
            expiresAt,
            status: 'pending', // pending, accepted, expired
        });

        return { code };
    } catch (error) {
        console.error("Failed to generate invite code:", error);
        throw new Error("Não foi possível gerar o código do convite.");
    }
}

export async function acceptInviteCode(code: string, token: string) {
    const user = await getAuthenticatedUser(token);
     if (!user) {
        throw new Error("Usuário não autenticado para aceitar o convite.");
    }

    const acceptingUserId = user.uid;
    
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
