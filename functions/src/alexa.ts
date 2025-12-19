import * as functions from 'firebase-functions';
import { extractTransactionFromSpeech, getSummaryFromSpeech } from './services/alexa-ai-client';
import { db } from './index';

// Helper to get User ID from Alexa's access token
async function getUserIdFromAccessToken(accessToken: string | undefined): Promise<string | null> {
    if (!accessToken) {
        console.log("Access token não encontrado.");
        return null;
    }
    // Em um cenário real, você decodificaria o token para obter o UID.
    // Para o MVP, vamos usar um mapeamento simples ou um UID fixo.
    // IMPORTANTE: Esta é uma simulação e NÃO é segura para produção.
    const userMapping: { [key: string]: string } = {
        // "amzn1.ask.account...": "firebase-uid-123"
    };

    // Para testes, vamos assumir um UID fixo se o token existir.
    // Substitua 'ALEXA_TEST_USER_UID' pelo UID real do usuário de teste no seu Firestore.
    return 'ALEXA_TEST_USER_UID'; 
}


export const alexa = functions.https.onRequest(async (req, res) => {
  try {
    const requestType = req.body?.request?.type;
    const intentName = req.body?.request?.intent?.name;
    const slots = req.body?.request?.intent?.slots;
    const accessToken = req.body?.session?.user?.accessToken;

    let speechText = "Não entendi o que você quis dizer.";

    // 🔹 1. QUANDO ABRE A SKILL
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

    // 🔹 2. ADICIONAR TRANSAÇÃO
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

    // 🔹 3. RESUMO FINANCEIRO
    if (requestType === 'IntentRequest' && intentName === 'GetSummaryIntent') {
        // Para um resumo, precisamos buscar as transações do usuário
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
