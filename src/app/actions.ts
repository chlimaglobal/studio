
'use server';

import { categorizeTransaction } from "@/ai/flows/categorize-transaction";
import { extractTransactionFromText } from "@/ai/flows/extract-transaction-from-text";
import { TransactionCategory, transactionCategories } from "@/lib/types";
import { Twilio } from 'twilio';

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
    return { error: 'Falha ao processar o comando de voz com a IA.' };
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
    console.warn(`AI returned invalid or no category for: "${description}"`);
    return { category: null, error: 'Não foi possível determinar uma categoria válida.' };
  } catch (e) {
    console.error("AI suggestion failed:", e);
    // Fail silently on the UI, but log the error.
    return { category: null, error: 'Falha ao obter sugestão da IA.' };
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
