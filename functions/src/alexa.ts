
import * as functions from "firebase-functions";
import { extractTransactionFromText } from "./ai/extractTransaction";
import { saveTransaction } from "./transactions/saveTransaction";
import { getUserSummary } from "./summary/getUserSummary";

export const alexa = functions.https.onRequest(async (req, res) => {
  try {
    const request = req.body?.request;
    const intentName = request?.intent?.name;
    const slots = request?.intent?.slots;

    let speechText = "Não consegui entender.";

    // ============================
    // 🔹 ADD TRANSACTION (VOZ)
    // ============================
    if (intentName === "AddTransactionIntent") {
      const phrase = slots?.frase?.value;

      if (!phrase) {
        speechText = "Não entendi a transação. Pode repetir?";
      } else {
        const transaction = await extractTransactionFromText(phrase);

        if (!transaction) {
          speechText = "Não consegui identificar valores ou categorias nessa transação.";
        } else {
          await saveTransaction({
            userId: "ALEXA_USER", // MVP — depois entra Account Linking
            ...transaction,
          });

          speechText = `Transação registrada com sucesso.`;
        }
      }
    }

    // ============================
    // 🔹 GET SUMMARY
    // ============================
    if (intentName === "GetSummaryIntent") {
      const summary = await getUserSummary("ALEXA_USER");

      speechText = `Seu saldo atual é de ${summary.balance} reais.`;
    }

    res.status(200).json({
      version: "1.0",
      response: {
        outputSpeech: {
          type: "PlainText",
          text: speechText,
        },
        shouldEndSession: true,
      },
    });
  } catch (error) {
    console.error("Alexa error:", error);

    res.status(200).json({
      version: "1.0",
      response: {
        outputSpeech: {
          type: "PlainText",
          text: "Ocorreu um erro ao processar sua solicitação.",
        },
        shouldEndSession: true,
      },
    });
  }
});
