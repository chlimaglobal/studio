
'use server';

import { categorizeTransaction } from "@/ai/flows/categorize-transaction";
import { extractTransactionFromText } from "@/ai/flows/extract-transaction-from-text";
import { TransactionCategory, transactionCategories } from "@/lib/types";
import { getAuth } from "firebase-admin/auth";
import { Twilio } from 'twilio';
import { adminApp, adminDb } from "@/lib/firebase-admin";
import sgMail from '@sendgrid/mail';

export async function extractTransactionInfoFromText(text: string) {
  if (!text) {
    return { error: 'O texto não pode estar vazio.' };
  }

  try {
    const result = await extractTransactionFromText({ text });
    if (result && result.amount && result.description && result.type) {
      const transactionData = {
        description: result.description,
        amount: result.amount,
        type: result.type,
        date: new Date(),
        category: result.category,
      };
      
      return transactionData;
    }
    return { error: 'Não foi possível extrair os detalhes da transação.' };
  } catch (e) {
    console.error(e);
    return { error: 'Falha ao processar o comando de voz com a Lúmina.' };
  }
}

export async function getCategorySuggestion(description: string): Promise<{ category: TransactionCategory | null, error: string | null }> {
  if (!description) {
    return { category: null, error: 'A descrição não pode estar vazia.' };
  }

  try {
    const result = await categorizeTransaction({ description });
    // @ts-ignore
    if (result.category && transactionCategories.includes(result.category)) {
      // @ts-ignore
      return { category: result.category, error: null };
    }
    // If the category is invalid or not returned, fail silently without user-facing error.
    console.warn(`Lúmina returned invalid or no category for: "${description}"`);
    return { category: null, error: 'Não foi possível determinar uma categoria válida.' };
  } catch (e) {
    console.error("Lúmina suggestion failed:", e);
    // Fail silently on the UI, but log the error.
    return { category: null, error: 'Falha ao obter sugestão da Lúmina.' };
  }
}


export async function sendWhatsAppNotification(body: string, to: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
    console.error('Twilio credentials are not set in environment variables.');
    return { success: false, error: 'Twilio credentials not configured.' };
  }
  
  if (!to) {
    console.log('User WhatsApp number not provided. Skipping notification.');
    return { success: false, error: 'User WhatsApp number not provided.' };
  }

  const client = new Twilio(accountSid, authToken);

  try {
    await client.messages.create({
      from: `whatsapp:${from}`,
      to: `whatsapp:${to}`,
      body: body,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    // @ts-ignore
    return { success: false, error: error.message };
  }
}

/**
 * This function sends a welcome email using SendGrid. It is designed to be
 * called from a Firebase Function that triggers on user creation.
 * @param email The new user's email address.
 * @param name The new user's name.
 */
export async function sendWelcomeEmail(email: string, name: string) {
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const templateId = process.env.SENDGRID_WELCOME_TEMPLATE_ID;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;

  if (!sendgridApiKey || !templateId || !fromEmail) {
    console.error('SendGrid environment variables are not fully configured.');
    return { success: false, error: 'SendGrid environment variables not configured.' };
  }

  sgMail.setApiKey(sendgridApiKey);

  const msg = {
    to: email,
    from: fromEmail,
    templateId: templateId,
    dynamicTemplateData: {
      name: name,
    },
  };

  try {
    await sgMail.send(msg);
    console.log(`Welcome email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: 'Failed to send welcome email.' };
  }
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
    
