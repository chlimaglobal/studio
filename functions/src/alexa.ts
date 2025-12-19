import * as functions from "firebase-functions";
import { alexaExtractTransaction, getSimpleFinancialSummary } from "./index";
import { db } from "./index";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";

async function saveTransaction(userId: string, transaction: any) {
  if (!transaction) return;
  const dataToSave = {
    ...transaction,
    ownerId: userId,
    date: new Date(transaction.date),
  };
  await db.collection("users").doc(userId).collection("transactions").add(dataToSave);
}

async function getSummary(userId: string, period: 'today' | 'month') {
    let startDate, endDate;
    const now = new Date();

    if (period === 'today') {
        startDate = startOfDay(now);
        endDate = endOfDay(now);
    } else { // month
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    const transactionsSnapshot = await db.collection("users").doc(userId).collection("transactions")
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .get();

    let totalIncome = 0;
    let totalExpense = 0;

    transactionsSnapshot.forEach(doc => {
        const t = doc.data();
        if (t.type === 'income') {
            totalIncome += t.amount;
        } else {
            totalExpense += t.amount;
        }
    });
    
    return {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense
    };
}


export const alexa = functions.https.onRequest(async (req, res) => {
  try {
    const requestType = req.body?.request?.type;
    const intentName = req.body?.request?.intent?.name;
    const slots = req.body?.request?.intent?.slots;

    let speechText = "Não entendi o que você quis dizer.";

    if (requestType === "LaunchRequest") {
      speechText = "Olá! Você pode adicionar uma transação ou pedir um resumo financeiro.";
    }

    if (requestType === "IntentRequest" && intentName === "AddTransactionIntent") {
      const phrase = slots?.frase?.value;
      if (!phrase) {
        speechText = "Não entendi a transação. Pode repetir?";
      } else {
        const transactionData = await alexaExtractTransaction({ text: phrase });
        if (transactionData) {
            await saveTransaction("ALEXA_USER_PLACEHOLDER", transactionData);
            speechText = `Transação de ${transactionData.description} registrada.`;
        } else {
            speechText = "Não consegui extrair os detalhes da transação. Tente novamente.";
        }
      }
    }

    if (requestType === "IntentRequest" && intentName === "GetSummaryIntent") {
      const periodSlot = slots?.periodo?.value?.toLowerCase() || 'mês';
      const period = periodSlot.includes('hoje') ? 'today' : 'month';
      
      const summaryData = await getSummary("ALEXA_USER_PLACEHOLDER", period);
      const summaryResult = await getSimpleFinancialSummary({ ...summaryData, period });
      
      speechText = summaryResult.summary;
    }

    res.json({
      version: "1.0",
      response: {
        outputSpeech: { type: "PlainText", text: speechText },
        shouldEndSession: true
      }
    });

  } catch (error) {
    console.error("Alexa error:", error);
    res.json({
      version: "1.0",
      response: {
        outputSpeech: { type: "PlainText", text: "Ocorreu um erro ao processar sua solicitação." },
        shouldEndSession: true
      }
    });
  }
});
