
'use server';

import { adminDb, adminAuth, adminApp } from '@/lib/firebase-admin';
import { headers } from 'next/headers';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { customAlphabet } from 'nanoid';

async function getAuthenticatedUser() {
    const auth = adminAuth;
    if (!auth) return null;
    try {
        const token = headers().get('Authorization')?.split('Bearer ')[1];
        if (!token) return null;
        const decodedToken = await auth.verifyIdToken(token);
        return { uid: decodedToken.uid };
    } catch (error) {
        console.error('Error verifying auth token:', error);
        return null;
    }
}

export async function generateInviteCode(accountId: string) {
    const user = await getAuthenticatedUser();
    if (!user) {
        throw new Error("Usuário não autenticado.");
    }
    if (!adminDb) {
        throw new Error("O banco de dados do administrador não foi inicializado.");
    }

    // Generate a user-friendly, unique 8-character code (uppercase letters and numbers)
    const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);
    const code = nanoid();
    const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

    try {
        const inviteRef = await adminDb.collection('invites').add({
            code,
            accountId,
            generatedBy: user.uid,
            expiresAt,
            status: 'pending', // pending, accepted, expired
        });

        return { code };
    } catch (error) {
        console.error("Failed to generate invite code:", error);
        throw new Error("Não foi possível gerar o código de convite.");
    }
}

export async function acceptInviteCode(code: string) {
    const user = await getAuthenticatedUser();
    if (!user) {
        throw new Error("Usuário não autenticado.");
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

    const accountRef = adminDb.collectionGroup('accounts').where('id', '==', inviteData.accountId);
    // This is not efficient, but Firestore security rules would prevent this query.
    // In a real app, the path to the account would be stored in the invite.
    // For now, let's assume a fixed path structure for simplicity of the query.
    // This part of the code needs to be adapted based on the actual DB structure.
    // As we have it, accounts are in /users/{uid}/accounts/{accountId}
    // We can get the owner UID from the invite.
    const accountDocRef = adminDb.collection('users').doc(inviteData.generatedBy).collection('accounts').doc(inviteData.accountId);
    
    const accountDoc = await accountDocRef.get();
    if (!accountDoc.exists) {
        throw new Error("A conta associada a este convite não foi encontrada.");
    }

    // Add user to the account and update invite status
    await accountDocRef.update({
        memberIds: FieldValue.arrayUnion(user.uid),
        isShared: true,
    });
    
    await inviteDoc.ref.update({
        status: 'accepted',
        acceptedBy: user.uid,
        acceptedAt: Timestamp.now(),
    });

    return { success: true, accountName: accountDoc.data()?.name };
}
