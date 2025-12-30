import * as functions from 'firebase-functions';
import { extractTransactionFromSpeech, getSummaryFromSpeech } from './services/alexa-ai-client';
import { db } from './index';

// Helper to get User ID from Alexa's access token
async function getUserIdFromAccessToken(accessToken: string | undefined): Promise<string | null> {
    if (!accessToken) {
        return null;
    }
    // In a real scenario, you would decode the token to get the UID.
    // For this MVP, we'll use a fixed UID for testing.
    // IMPORTANT: This is a simulation and is NOT secure for production.
    return 'ALEXA_TEST_USER_UID'; 
}


export const alexaWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const requestType = req.body?.request?.type;
    const intentName = req.body?.request?.intent?.name;
    const slots = req.body?.request?.intent?.slots;
    const accessToken = req.body?.session?.user?.accessToken;

    let speechText = "Não entendi o que você quis dizer.";

    if (requestType === 'LaunchRequest') {
      speechText = 'Olá! Você pode adicionar uma transação ou pedir um resumo financeiro.';
    }

    const userId = await getUserIdFromAccessToken(accessToken);

    if (!userId && requestType === 'IntentRequest') {
        speechText = "Por favor, vincule sua conta do FinanceFlow na Alexa para continuar.";
        res.json({
            version: "1.0",
            response: {
                outputSpeech: { type: "PlainText", text: speechText },
                card: { type: "LinkAccount" },
                shouldEndSession: true
            }
        });
        return;
    }

    if (requestType === 'IntentRequest' && intentName === 'AddTransactionIntent') {
      const phrase = slots?.frase?.value;

      if (!phrase) {
        speechText = 'Não entendi a transação. Pode repetir?';
      } else {
        const extractedData = await extractTransactionFromSpeech(phrase);
        if (extractedData) {
            await db.collection('users').doc(userId!).collection('transactions').add(extractedData);
            speechText = `Ok, registrei: ${extractedData.description} de ${extractedData.amount} reais.`;
        } else {
            speechText = `Não consegui entender os detalhes da transação em "${phrase}". Pode tentar de novo?`;
        }
      }
    }

    if (requestType === 'IntentRequest' && intentName === 'GetSummaryIntent') {
        const snapshot = await db.collection('users').doc(userId!).collection('transactions').get();
        const transactions = snapshot.docs.map(doc => doc.data());
        speechText = await getSummaryFromSpeech(transactions);
    }

    res.json({
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: speechText,
        },
        shouldEndSession: true,
      },
    });
  } catch (error) {
    console.error('Alexa error:', error);
    res.json({
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: 'Ocorreu um erro ao processar sua solicitação.',
        },
        shouldEndSession: true,
      },
    });
  }
});
