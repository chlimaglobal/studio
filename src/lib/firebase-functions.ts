
import { adminDb, adminApp } from './firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import * as sgMail from '@sendgrid/mail';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getAuth } from 'firebase-admin/auth';
import { randomBytes } from 'crypto';
import { Transaction } from '@/lib/types';

const sendGridApiKey = process.env.SENDGRID_API_KEY;
if (sendGridApiKey) {
    sgMail.setApiKey(sendGridApiKey);
} else {
    console.warn('SENDGRID_API_KEY is not set. Emails will not be sent.');
}

/**
 * Triggers when a new transaction is created and sends a push notification to the user.
 * This is now a Callable Function.
 * @param {object} data - The data passed to the function, containing userId and transactionData.
 * @param {object} context - The context of the call.
 */
export const onTransactionCreated = onCall(async (request) => {
    const { userId, transactionData } = request.data;

    if (!adminApp) {
        console.warn("Admin App not initialized, skipping notification.");
        throw new HttpsError('internal', 'Admin App not initialized.');
    }

    if (!userId || !transactionData) {
         console.log("Missing userId or transaction data, skipping notification.");
        throw new HttpsError('invalid-argument', 'Missing userId or transaction data.');
    }

    const userDocRef = adminDb!.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
        console.log(`User document for ${userId} not found.`);
        throw new HttpsError('not-found', `User ${userId} not found.`);
    }

    const userData = userDoc.data();
    const fcmTokens = userData?.fcmTokens;

    if (!fcmTokens || !Array.isArray(fcmTokens) || fcmTokens.length === 0) {
        console.log(`No FCM tokens found for user ${userId}.`);
        return { success: true, message: "No FCM tokens to send." };
    }

    const { type, amount, description } = transactionData;
    const title = type === 'income' ? 'Nova Receita Registrada!' : 'Nova Despesa Registrada!';
    const body = `${description}: R$${amount.toFixed(2)}`;

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

    try {
        const response = await getMessaging(adminApp).sendEachForMulticast(message);
        console.log(`Successfully sent ${response.successCount} messages.`);
        
        if (response.failureCount > 0) {
            const tokensToRemove: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
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
        return { success: true, message: "Notifications sent." };
    } catch (error) {
        console.error('Error sending notification:', error);
        throw new HttpsError('internal', 'Failed to send notifications.');
    }
});

export const checkDashboardStatus = onCall(async (request) => {
    const userId = request.auth?.uid;
    if (!userId) {
        throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    if (!adminApp) {
        console.warn("Admin App not initialized, skipping check.");
        throw new HttpsError('internal', 'Admin App not initialized.');
    }

    const userDocRef = adminDb!.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
        throw new HttpsError('not-found', `User ${userId} not found.`);
    }
    
    const userData = userDoc.data()!;
    const costOfLiving = userData.manualCostOfLiving ?? 0;
    const lastSent = (userData.lumina?.costOfLivingPromptLastSent as Timestamp | undefined)?.toMillis();
    const threeDaysInMillis = 3 * 24 * 60 * 60 * 1000;

    // Condition 1: Cost of living is not set
    // Condition 2: Notification has not been sent in the last 3 days
    if (costOfLiving <= 0 && (!lastSent || (Date.now() - lastSent > threeDaysInMillis))) {
        const fcmTokens = userData.fcmTokens;
        if (!fcmTokens || !Array.isArray(fcmTokens) || fcmTokens.length === 0) {
            console.log(`No FCM tokens found for user ${userId}, skipping cost of living prompt.`);
            return { success: true, message: "No FCM tokens for prompt." };
        }

        const message = {
            notification: {
                title: 'Lúmina tem uma dica para você!',
                body: "Tudo pronto para começar, só falta um passo: defina seu custo de vida para que seu painel fique 100% preciso.",
            },
            tokens: fcmTokens,
            webpush: {
                notification: {
                    badge: '/icon-192x192.png',
                    icon: '/icon-192x192.png',
                    data: {
                        url: '/dashboard/cost-of-living'
                    }
                },
                 fcmOptions: {
                    link: '/dashboard/cost-of-living'
                }
            },
        };
        
        try {
            await getMessaging(adminApp).sendEachForMulticast(message);
            // Update the timestamp after sending
            await userDocRef.set({
                lumina: {
                    costOfLivingPromptLastSent: Timestamp.now()
                }
            }, { merge: true });
            
            return { success: true, message: "Cost of living prompt sent." };

        } catch (error) {
            console.error('Error sending cost of living prompt:', error);
            throw new HttpsError('internal', 'Failed to send notification.');
        }
    }

    return { success: true, message: "No action needed." };
});


export const sendDependentInvite = onCall(async (request) => {
    if (!sendGridApiKey) {
        console.error("SendGrid API Key not configured. Cannot send invite email.");
        throw new HttpsError('internal', 'O serviço de e-mail não está configurado no servidor.');
    }

    const inviterUid = request.auth?.uid;
    if (!inviterUid) {
        throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    const { dependentName, dependentEmail } = request.data;
    if (!dependentName || !dependentEmail) {
        throw new HttpsError('invalid-argument', 'Nome e e-mail do dependente são obrigatórios.');
    }

    const inviterDoc = await adminDb!.collection('users').doc(inviterUid).get();
    const inviterName = inviterDoc.data()?.displayName || 'um usuário';

    // In a real app, you would generate a secure, short-lived token.
    // For this example, we'll create a simple placeholder token.
    const inviteToken = `INVITE_${Date.now()}`;
    const inviteLink = `https://financeflow-we0in.web.app/signup?invite=${inviteToken}`;

    const msg = {
        to: dependentEmail,
        from: 'financeflowsuporte@proton.me', // Use a verified sender email
        subject: `Você foi convidado para o FinanceFlow por ${inviterName}!`,
        html: `
            <h1>Olá, ${dependentName}!</h1>
            <p>${inviterName} convidou você para se juntar a ele(a) no FinanceFlow e começar a gerenciar suas finanças.</p>
            <p>Clique no link abaixo para criar sua conta:</p>
            <a href="${inviteLink}">Criar minha conta no FinanceFlow</a>
            <p>Se você não estava esperando este convite, pode ignorar este e-mail.</p>
        `,
    };

    try {
        await sgMail.send(msg);
        return { success: true, message: 'O convite foi enviado com sucesso por e-mail.' };
    } catch (error) {
        console.error("SendGrid Error:", error);
        throw new HttpsError('internal', 'Falha ao enviar o e-mail de convite.');
    }
});

// Helper to generate a random code
function generateRandomCode(length: number) {
    return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length).toUpperCase();
}


export const generateInviteCode = onCall(async (request) => {
    const inviterUid = request.auth?.uid;
    if (!inviterUid) {
        throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    const { accountId } = request.data;
    if (!accountId) {
        throw new HttpsError('invalid-argument', 'O ID da conta é obrigatório.');
    }

    const accountRef = adminDb!.collection('users').doc(inviterUid).collection('accounts').doc(accountId);
    const accountDoc = await accountRef.get();
    
    // Check if the inviter is the owner of the account.
    if (!accountDoc.exists || accountDoc.data()?.ownerId !== inviterUid) {
        throw new HttpsError('permission-denied', 'Você não tem permissão para compartilhar esta conta.');
    }

    const code = generateRandomCode(8);
    const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const inviteData = {
        code,
        accountId,
        accountRef: accountRef.path,
        inviterUid,
        expiresAt,
        used: false,
    };

    await adminDb!.collection('invites').doc(code).set(inviteData);
    
    return { success: true, code: code };
});

export const acceptInviteCode = onCall(async (request) => {
    const inviteeUid = request.auth?.uid;
    if (!inviteeUid) {
        throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
    }
    const { code } = request.data;
    if (!code) {
        throw new HttpsError('invalid-argument', 'O código do convite é obrigatório.');
    }

    const inviteRef = adminDb!.collection('invites').doc(code);
    const inviteDoc = await inviteRef.get();

    if (!inviteDoc.exists || inviteDoc.data()?.used) {
        throw new HttpsError('not-found', 'Código de convite inválido ou já utilizado.');
    }

    const inviteData = inviteDoc.data()!;

    if (inviteData.expiresAt.toMillis() < Date.now()) {
        throw new HttpsError('deadline-exceeded', 'Este código de convite expirou.');
    }

    if (inviteData.inviterUid === inviteeUid) {
        throw new HttpsError('invalid-argument', 'Você não pode convidar a si mesmo.');
    }

    const accountRef = adminDb!.doc(inviteData.accountRef);
    const accountDoc = await accountRef.get();
    if (!accountDoc.exists) {
         throw new HttpsError('not-found', 'A conta associada a este convite não existe mais.');
    }
    
    const accountData = accountDoc.data()!;

    const batch = adminDb!.batch();

    // Add member to account
    batch.update(accountRef, {
        memberIds: FieldValue.arrayUnion(inviteeUid),
        isShared: true
    });
    
    // Add shared account reference to invitee's user doc
    const sharedAccountRef = adminDb!.collection('users').doc(inviteeUid).collection('sharedAccounts').doc(inviteData.accountId);
    batch.set(sharedAccountRef, { accountRef: inviteData.accountRef });
    
    // Mark invite as used
    batch.update(inviteRef, { used: true, inviteeUid: inviteeUid });

    await batch.commit();

    return { success: true, accountName: accountData.name };
});

export const getPartnerId = onCall(async (request) => {
    const userId = request.auth?.uid;
    if (!userId) {
        throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    if (!adminDb) {
        throw new HttpsError('internal', 'Database service is not available.');
    }

    // A user is a "partner" if they are a member of an account owned by someone else.
    // Query the `sharedAccounts` subcollection for the current user.
    const sharedAccountsQuery = adminDb.collection('users').doc(userId).collection('sharedAccounts');
    const sharedAccountsSnapshot = await sharedAccountsQuery.get();
    
    if (!sharedAccountsSnapshot.empty) {
        // Get the first shared account reference
        const sharedAccountDoc = sharedAccountsSnapshot.docs[0];
        const accountRefPath = sharedAccountDoc.data().accountRef;
        const accountRef = adminDb.doc(accountRefPath);
        const accountDoc = await accountRef.get();
        
        if (accountDoc.exists) {
            const ownerId = accountDoc.data()?.ownerId;
            return { partnerId: ownerId || null };
        }
    }
    
    // A user is also a "partner" if they own an account that has other members.
    const ownedAccountsQuery = adminDb.collection('users').doc(userId).collection('accounts').where('isShared', '==', true);
    const ownedAccountsSnapshot = await ownedAccountsQuery.get();

    if (!ownedAccountsSnapshot.empty) {
        const accountDoc = ownedAccountsSnapshot.docs[0];
        const memberIds = accountDoc.data().memberIds as string[];
        const partnerId = memberIds.find(id => id !== userId);
        return { partnerId: partnerId || null };
    }

    return { partnerId: null };
});

export const handleUserLogin = onCall(async (request) => {
    const userId = request.auth?.uid;
    if (!userId) {
        throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    if (!adminApp) {
        console.warn("Admin App not initialized, skipping login check.");
        throw new HttpsError('internal', 'Admin App not initialized.');
    }
    const db = adminDb!;
    const statsRef = db.collection('users').doc(userId).collection('stats').doc('logins');
    const userRef = db.collection('users').doc(userId);

    try {
        await db.runTransaction(async (transaction) => {
            const statsDoc = await transaction.get(statsRef);
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) {
                console.log(`User doc ${userId} not found in transaction.`);
                return;
            }

            const userData = userDoc.data()!;
            
            // Increment login count
            const currentCount = statsDoc.exists ? statsDoc.data()!.loginCount : 0;
            const newCount = currentCount + 1;
            transaction.set(statsRef, { loginCount: newCount }, { merge: true });

            if (newCount < 3) {
                return; // Not yet 3 logins, do nothing more
            }

            // Check if there are transactions
            const transactionsRef = db.collection('users').doc(userId).collection('transactions');
            const transactionsSnapshot = await transactionsRef.limit(1).get();

            if (!transactionsSnapshot.empty) {
                return; // User has transactions, do nothing more
            }

            // Check if prompt was sent in the last 7 days
            const lastSent = (userData.lumina?.noTransactionsPromptLastSent as Timestamp | undefined)?.toMillis();
            const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;

            if (lastSent && (Date.now() - lastSent < sevenDaysInMillis)) {
                return; // Prompt sent recently, do nothing more
            }

            // All conditions met, send notification
            const fcmTokens = userData.fcmTokens;
            if (!fcmTokens || fcmTokens.length === 0) {
                console.log(`No FCM tokens for user ${userId}, skipping notification.`);
                return;
            }

            const message = {
                notification: {
                    title: 'Lúmina tem uma dica para você!',
                    body: "Percebi que você ainda não cadastrou suas entradas e saídas. Posso te ajudar a começar agora mesmo?",
                },
                tokens: fcmTokens,
                webpush: {
                    notification: {
                        badge: '/icon-192x192.png',
                        icon: '/icon-192x192.png',
                        data: { url: '/dashboard' } // Or a more specific page
                    },
                    fcmOptions: { link: '/dashboard' }
                },
            };

            await getMessaging(adminApp).sendEachForMulticast(message);
            
            // Reset login count and update timestamp
            transaction.update(statsRef, { loginCount: 0 });
            transaction.set(userRef, {
                lumina: {
                    noTransactionsPromptLastSent: Timestamp.now()
                }
            }, { merge: true });
        });

        return { success: true, message: 'Login handled.' };
    } catch (error) {
        console.error('Error in handleUserLogin transaction:', error);
        throw new HttpsError('internal', 'Failed to handle user login.');
    }
});


/**
 * Scheduled function that runs on the last day of every month at 23:55.
 * It calculates the monthly balance for each user and sends a notification if it's positive.
 */
export const sendMonthlySummary = onSchedule("55 23 L * *", async (event) => {
    console.log("Running monthly summary function.");
    if (!adminDb || !adminApp) {
        console.error("Admin services not initialized. Aborting.");
        return;
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    const usersSnapshot = await adminDb.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();

        // Check if a notification has already been sent this month
        const lastSentTimestamp = userData.lumina?.monthlySuccessLastSent as Timestamp | undefined;
        if (lastSentTimestamp) {
            const lastSentDate = lastSentTimestamp.toDate();
            if (lastSentDate.getMonth() === currentMonth && lastSentDate.getFullYear() === currentYear) {
                console.log(`Skipping user ${userId}: notification already sent this month.`);
                continue;
            }
        }
        
        const fcmTokens = userData.fcmTokens;
        if (!fcmTokens || fcmTokens.length === 0) {
            console.log(`Skipping user ${userId}: no FCM tokens.`);
            continue;
        }

        const transactionsRef = adminDb.collection('users').doc(userId).collection('transactions');
        const query = transactionsRef
            .where('date', '>=', startOfMonth)
            .where('date', '<=', endOfMonth);

        const transactionsSnapshot = await query.get();

        if (transactionsSnapshot.empty) {
            console.log(`Skipping user ${userId}: no transactions this month.`);
            continue;
        }

        let totalIncome = 0;
        let totalExpense = 0;

        transactionsSnapshot.forEach(doc => {
            const t = doc.data() as Transaction;
            if (t.type === 'income') {
                totalIncome += t.amount;
            } else {
                totalExpense += t.amount;
            }
        });

        const balance = totalIncome - totalExpense;
        console.log(`User ${userId} monthly balance: ${balance}`);

        if (balance > 0) {
            console.log(`User ${userId} has a positive balance. Sending notification.`);
            const message = {
                notification: {
                    title: 'Parabéns!',
                    body: "Incrível! Você fechou o mês no azul. Quer ver o que contribuiu mais para esse resultado?",
                },
                tokens: fcmTokens,
                webpush: {
                    notification: {
                        badge: '/icon-192x192.png',
                        icon: '/icon-192x192.png',
                        data: { url: '/dashboard/reports' }
                    },
                    fcmOptions: { link: '/dashboard/reports' }
                },
            };

            try {
                await getMessaging(adminApp).sendEachForMulticast(message);
                await adminDb.collection('users').doc(userId).set({
                    lumina: {
                        monthlySuccessLastSent: Timestamp.now()
                    }
                }, { merge: true });
                console.log(`Notification sent to user ${userId}.`);
            } catch (error) {
                console.error(`Error sending notification to user ${userId}:`, error);
            }
        }
    }
});

    