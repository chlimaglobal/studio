
import { adminDb, adminApp } from './firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { formatCurrency } from './utils';
import * as sgMail from '@sendgrid/mail';
import { onCall } from 'firebase-functions/v2/https';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

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
