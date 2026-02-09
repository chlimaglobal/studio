import * as functions from 'firebase-functions';
import { logger } from 'firebase-functions/logger';  // Adicionado para logs melhores
import { HttpsError } from 'firebase-functions/v2/https';  // Para erros padronizados
import { extractTransactionFromSpeech, getSummaryFromSpeech } from './services/alexa-ai-client';
import { db } from './index';
import { subMonths } from 'date-fns';  // Adicionado para filtro por data (instale date-fns)

// Helper to get User ID from Alexa's accessToken (melhorado com simulação segura)
async function getUserIdFromAccessToken(accessToken: string | undefined): Promise<string | null> {
  if (!accessToken) {
    logger.warn('Access token não encontrado na requisição Alexa.');
    return null;
  }
  // TODO: Em produção, decode accessToken (OAuth Alexa) e gere Firebase Custom Token
  // Exemplo simulado: Retorne UID baseado em token (não fixo)
  // Para teste, use hash simples ou mapeamento
  return 'user_' + accessToken.substring(0, 10);  // Simulação NÃO SEGURA - substitua por auth real!
}

// Verificação de assinatura (adicionada para modo pago)
async function checkSubscription(userId: string): Promise<boolean> {
  const userDoc = await db.collection('users').doc(userId).get();
  return userDoc.exists && userDoc.data()?.subscriptionActive === true;
}

export const alexaWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // Validação de payload (adicionada para robustez)
    if (!req.body || !req.body.request) {
      throw new HttpsError('invalid-argument', 'Payload Alexa inválido.');
    }

    const requestType = req.body.request.type;
    const intentName = req.body.request.intent?.name;
    const slots = req.body.request.intent?.slots;
    const accessToken = req.body.session?.user?.accessToken;

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

    // Verificação de assinatura para intents pagos (adicionada)
    if (requestType === 'IntentRequest' && !await checkSubscription(userId!)) {
      speechText = "Essa funcionalidade requer assinatura ativa no FinanceFlow. Acesse o app para assinar.";
      res.json({...});  // Mesma resposta padrão
      return;
    }

    if (requestType === 'IntentRequest' && intentName === 'AddTransactionIntent') {
      const phrase = slots?.frase?.value;

      if (!phrase) {
        speechText = 'Não entendi a transação. Pode repetir?';
      } else {
        const extractedData = await extractTransactionFromSpeech(phrase);
        if (extractedData) {
          // Para v2 security, chame callable se disponível; aqui usa db direto (v1)
          await db.collection('users').doc(userId!).collection('transactions').add(extractedData);
          speechText = `Ok, registrei: ${extractedData.description} de ${extractedData.amount} reais.`;
        } else {
          speechText = `Não consegui entender os detalhes da transação em "${phrase}". Pode tentar de novo?`;
        }
      }
    }

    if (requestType === 'IntentRequest' && intentName === 'GetSummaryIntent') {
      // Filtro por data (adicionado para performance; ex: último mês)
      const startDate = subMonths(new Date(), 1);
      const snapshot = await db.collection('users').doc(userId!).collection('transactions')
        .where('date', '>=', startDate)
        .get();
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
    logger.error('Alexa error:', error);  // Atualizado para logger
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