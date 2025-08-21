
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { customAlphabet } from 'nanoid';
import { getAuth } from 'firebase-admin/auth';
import { cookies } from 'next/headers';
import { nextApp } from '@/lib/firebase-server';

async function getUserIdFromSessionCookie(): Promise<string | null> {
    const sessionCookie = cookies().get('__session')?.value;
    if (!sessionCookie) {
        console.error('Session cookie not found.');
        return null;
    }
    try {
        const auth = getAuth(nextApp);
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        return decodedClaims.uid;
    } catch (error) {
        console.error('Error verifying session cookie in Server Action:', error);
        return null;
    }
}

export async function generateInviteCode(accountId: string) {
    if (!adminDb) {
        throw new Error('O banco de dados do administrador não foi inicializado.');
    }

    const senderId = await getUserIdFromSessionCookie();
    if (!senderId) {
        throw new Error('Usuário não autenticado.');
    }

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
        console.error("Error generating invite code:", error);
        return { success: false, error: 'Não foi possível gerar o código de convite.' };
    }
}

export async function acceptInviteCode(code: string) {
    if (!adminDb) {
        throw new Error('O banco de dados do administrador não foi inicializado.');
    }
    const acceptorId = await getUserIdFromSessionCookie();
    if (!acceptorId) {
        throw new Error('Usuário não autenticado para aceitar o convite.');
    }

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
        console.error("Error accepting invite code:", error);
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
        return { success: false, error: errorMessage };
    }
}
