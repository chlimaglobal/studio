import * as functions from "firebase-functions";
import { extractTransactionFromText } from "./ai/extractTransaction";
import { saveTransaction } from "./transactions/saveTransaction";
import { getUserSummary } from "./summary/getUserSummary";

export const alexaWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const intent = req.body?.request?.intent?.name;
    const slots = req.body?.request?.intent?.slots;

    let speechText = "Não consegui entender.";

    // 🔹 ADD TRANSACTION
    if (intent === "AddTransactionIntent") {
      const phrase = slots?.frase?.value;

      if (!phrase) {
        speechText = "Não entendi a transação. Pode repetir?";
      } else {
        // IA interpreta a frase
        const transaction = await extractTransactionFromText(phrase);

        await saveTransaction({
          userId: "ALEXA_USER", // depois vinculamos conta
          ...transaction
        });

        speechText = `Transação registrada: ${transaction.description}`;
      }
    }

    // 🔹 GET SUMMARY
    if (intent === "GetSummaryIntent") {
      const summary = await getUserSummary("ALEXA_USER");

      speechText = `Seu saldo atual é ${summary.balance} reais`;
    }

    res.json({
      version: "1.0",
      response: {
        outputSpeech: {
          type: "PlainText",
          text: speechText
        },
        shouldEndSession: true
      }
    });

  } catch (error) {
    console.error(error);
    res.json({
      version: "1.0",
      response: {
        outputSpeech: {
          type: "PlainText",
          text: "Ocorreu um erro ao processar sua solicitação."
        },
        shouldEndSession: true
      }
    });
  }
});
