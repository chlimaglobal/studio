
import { adminDb, adminApp } from './firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import * as sgMail from '@sendgrid/mail';
import { onCall } from 'firebase-functions/v2/https';

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
        return { success: false, error: "Admin App not initialized" };
    }

    if (!userId || !transactionData) {
        console.log("Missing userId or transaction data, skipping notification.");
        return { success: false, error: "Missing userId or transaction data" };
    }

    const userDocRef = adminDb!.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
        console.log(`User document for ${userId} not found.`);
        return { success: false, error: `User ${userId} not found` };
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
        return { success: false, error: "Failed to send notifications." };
    }
});

export const sendDependentInvite = onCall(async (request) => {
    if (!sendGridApiKey) {
        console.error("SendGrid API Key not configured. Cannot send invite email.");
        return { success: false, error: 'O serviço de e-mail não está configurado no servidor.' };
    }

    const inviterUid = request.auth?.uid;
    if (!inviterUid) {
        return { success: false, error: 'Usuário não autenticado.' };
    }

    const { dependentName, dependentEmail } = request.data;
    if (!dependentName || !dependentEmail) {
        return { success: false, error: 'Nome e e-mail do dependente são obrigatórios.' };
    }

    const inviterDoc = await adminDb!.collection('users').doc(inviterUid).get();
    const inviterName = inviterDoc.data()?.displayName || 'um usuário';

    // In a real app, you would generate a secure, short-lived token.
    // For this example, we'll create a simple placeholder token.
    const inviteToken = `INVITE_${Date.now()}`;
    const inviteLink = `https://financeflow-we0in.web.app/signup?invite=${inviteToken}`;

    const msg = {
        to: dependentEmail,
        from: 'financeflow-support@example.com', // Use a verified sender email
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
        return { success: false, error: 'Falha ao enviar o e-mail de convite.' };
    }
});
