import * as functions from "firebase-functions";

export const alexa = functions.https.onRequest(async (req, res) => {
  try {
    const requestType = req.body?.request?.type;
    const intentName = req.body?.request?.intent?.name;
    const slots = req.body?.request?.intent?.slots;

    let speechText = "Não entendi o que você quis dizer.";

    // 🔹 1. QUANDO ABRE A SKILL
    if (requestType === "LaunchRequest") {
      speechText =
        "Olá! Você pode adicionar uma transação ou pedir um resumo financeiro.";
    }

    // 🔹 2. ADICIONAR TRANSAÇÃO
    if (requestType === "IntentRequest" && intentName === "AddTransactionIntent") {
      const phrase = slots?.frase?.value;

      if (!phrase) {
        speechText = "Não entendi a transação. Pode repetir?";
      } else {
        // MVP: apenas confirma
        speechText = `Transação registrada: ${phrase}`;
      }
    }

    // 🔹 3. RESUMO FINANCEIRO
    if (requestType === "IntentRequest" && intentName === "GetSummaryIntent") {
      speechText = "Seu resumo financeiro ainda está em desenvolvimento.";
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
    console.error("Alexa error:", error);
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
