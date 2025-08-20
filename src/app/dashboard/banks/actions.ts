
'use server';

import { adminDb, adminAuth, adminApp } from '@/lib/firebase-admin';
import { getAuth } from "firebase-admin/auth";
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { customAlphabet } from 'nanoid';
import { cookies } from 'next/headers';

async function getUserIdFromSessionCookie() {
    try {
        const sessionCookie = cookies().get("__session")?.value;
        if (!sessionCookie) return null;
        
        const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
        return decodedToken.uid;

    } catch (error) {
        console.error('Error verifying auth token:', error);
        return null;
    }
}

export async function generateInviteCode(userId: string, accountId: string) {
    if (!userId) {
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
            generatedBy: userId,
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
    const acceptingUserId = await getUserIdFromSessionCookie();
    if (!acceptingUserId) {
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
    
    if (inviteData.generatedBy === acceptingUserId) {
        throw new Error("Você não pode aceitar seu próprio convite.");
    }

    const accountDocRef = adminDb.collection('users').doc(inviteData.generatedBy).collection('accounts').doc(inviteData.accountId);
    
    const accountDoc = await accountDocRef.get();
    if (!accountDoc.exists) {
        throw new Error("A conta associada a este convite não foi encontrada.");
    }

    // Add user to the account's member list and the shared account to the user's document
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
    
    // Add a reference to the shared account in the accepting user's document
    const userSharedAccountRef = adminDb.collection('users').doc(acceptingUserId).collection('sharedAccounts').doc(inviteData.accountId);
    batch.set(userSharedAccountRef, {
       accountRef: accountDocRef,
       ownerId: inviteData.generatedBy,
       sharedAt: Timestamp.now(),
    });

    await batch.commit();

    return { success: true, accountName: accountDoc.data()?.name };
}

export async function getPartnerId(userId: string): Promise<string | null> {
    if (!adminDb) {
        console.error("O banco de dados do administrador não foi inicializado.");
        return null;
    }
    if (!userId) {
        console.error("userId não fornecido para getPartnerId.");
        return null;
    }

    try {
        const sharedAccountsRef = adminDb.collection('users').doc(userId).collection('sharedAccounts');
        const querySnapshot = await sharedAccountsRef.limit(1).get();

        if (querySnapshot.empty) {
            // No shared accounts, so no partner found through this method.
            // Let's try checking if any of our owned accounts are shared.
             const ownedAccountsRef = adminDb.collection('users').doc(userId).collection('accounts');
             const ownedQuerySnapshot = await ownedAccountsRef.where('isShared', '==', true).limit(1).get();
            
             if (ownedQuerySnapshot.empty) {
                return null;
             }

            const accountData = ownedQuerySnapshot.docs[0].data();
            const partnerId = accountData.memberIds.find((id: string) => id !== userId);
            return partnerId || null;
        }

        const sharedAccountData = querySnapshot.docs[0].data();
        return sharedAccountData.ownerId || null;
    } catch (error) {
        console.error("Erro ao buscar ID do parceiro:", error);
        return null;
    }
}
