
'use server';

// Garante que o SDK do Admin seja inicializado antes de qualquer outra coisa.
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { customAlphabet } from 'nanoid';
import { getAuth } from 'firebase/auth/next';
import { cookies } from 'next/headers';
import { nextApp } from '@/lib/firebase-server';

// Função para obter o usuário autenticado de forma segura no lado do servidor.
async function getUserIdFromSessionCookie() {
    try {
        const sessionCookie = cookies().get('session')?.value;
        if (!sessionCookie) return null;
        
        const auth = getAuth(nextApp);
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        return decodedClaims.uid;
    } catch (error) {
        console.error("Failed to verify session cookie:", error);
        return null;
    }
}


export async function generateInviteCode(accountId: string) {
    if (!adminDb) {
        return { error: "O banco de dados do administrador não foi inicializado." };
    }

    const userId = await getUserIdFromSessionCookie();
    if (!userId) {
        return { error: "Usuário não autenticado." };
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
            status: 'pending',
        });

        return { code };
    } catch (error) {
        console.error("Failed to generate invite code:", error);
        return { error: "Não foi possível gerar o código do convite." };
    }
}

export async function acceptInviteCode(code: string) {
     if (!adminDb) {
        throw new Error("O banco de dados do administrador não foi inicializado.");
    }

    const acceptingUserId = await getUserIdFromSessionCookie();
    if (!acceptingUserId) {
        throw new Error("Usuário não autenticado para aceitar o convite.");
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
