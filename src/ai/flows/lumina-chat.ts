
"use server";

/**
 * Lúmina — fluxo oficial do assistente financeiro.
 * Compatível com imagens (base64), histórico e modo casal.
 */

import { ai } from "@/ai/genkit";
import type { LuminaChatInput, LuminaChatOutput } from "@/lib/types";
import { LuminaChatInputSchema, LuminaChatOutputSchema } from "@/lib/types";
import {
  LUMINA_BASE_PROMPT,
  LUMINA_VOICE_COMMAND_PROMPT,
  LUMINA_SPEECH_SYNTHESIS_PROMPT,
} from "@/ai/lumina/prompt/luminaBasePrompt";
import {
  GenerateRequest,
  generate,
  GenerationCommon,
} from "genkit/generate";

export async function generateSuggestion(
  input: LuminaChatInput
): Promise<LuminaChatOutput> {
  const luminaResponse = await luminaChatFlow(input);
  if (!luminaResponse?.text) {
    return {
      text: "Entendi sua mensagem! Quer que eu registre ou analise algo específico agora?",
      suggestions: [
        "Ver despesas do mês",
        "Sugestões para economizar",
        "Registrar despesa detectada",
      ],
    };
  }
  return luminaResponse;
}

export async function generateSuggestionStream(input: LuminaChatInput) {
  // 1) Normalizações / Segurança
  const userQuery = (input.userQuery || "").trim();
  const audioText = (input.audioText || "").trim();
  const isTTSActive = input.isTTSActive || false;
  const mappedChatHistory = (input.chatHistory || []).map((msg) => ({
    role: msg.role === "lumina" ? ("model" as const) : ("user" as const),
    content: [{ text: (msg.text || "").toString() }],
  }));
  const transactionsForContext = (input.allTransactions || []).slice(0, 30);
  let transactionsJSON = "[]";
  try {
    transactionsJSON = JSON.stringify(transactionsForContext, null, 2);
  } catch (e) {
    /* ignore */
  }

  // 2) Prompt dinâmico
  const promptContext = [
    LUMINA_BASE_PROMPT,
    audioText ? LUMINA_VOICE_COMMAND_PROMPT : "",
    isTTSActive ? LUMINA_SPEECH_SYNTHESIS_PROMPT : "",
    "",
    "### CONTEXTO SISTEMA (não repita literalmente ao usuário):",
    `- Modo Casal: ${input.isCoupleMode ? "Ativado" : "Desativado"}`,
    `- Transações recentes (últimas ${transactionsForContext.length}):`,
    transactionsJSON,
    audioText ? `- Áudio transcrito: ${audioText}` : "- Áudio transcrito: N/A",
    "",
    "### NOVA MENSAGEM DO USUÁRIO:",
    userQuery || "(mensagem vazia)",
    "",
    "Responda como Lúmina: seja humana, proativa, útil, nunca mostre erros técnicos e sempre termine com uma pergunta para engajar o usuário.",
  ].join("\n");

  // 3) Attachments (imagem em base64)
  let attachments: GenerationCommon["attachments"] = undefined;
  if (input.imageBase64) {
    const value = input.imageBase64 as string;
    const isDataUrl = /^data:.*;base64,/.test(value.trim());
    const mediaUrl = isDataUrl
      ? value.trim()
      : `data:image/png;base64,${value.trim()}`;
    attachments = [{ media: { url: mediaUrl, contentType: "image/png" } }];
  }

  // 4) Chamada ao Gemini via Genkit (STREAMING)
  const { stream } = ai.generateStream({
    model: "googleai/gemini-1.5-flash",
    prompt: promptContext,
    history: mappedChatHistory,
    attachments,
  });

  return stream;
}

const luminaChatFlow = ai.defineFlow(
  {
    name: "luminaChatFlow",
    inputSchema: LuminaChatInputSchema,
    outputSchema: LuminaChatOutputSchema,
    retrier: {
      maxAttempts: 3,
      backoff: {
        delayMs: 1500,
        multiplier: 2,
      },
    },
  },
  async (input) => {
    // ---------------------------
    // 1) Normalizações / Segurança
    // ---------------------------

    const userQuery = (input.userQuery || "").trim();
    const audioText = (input.audioText || "").trim();
    const isTTSActive = input.isTTSActive || false;

    // Mapeia o histórico para o formato esperado pelo Genkit/Gemini
    const mappedChatHistory = (input.chatHistory || []).map((msg) => ({
      role: msg.role === "lumina" ? ("model" as const) : ("user" as const),
      content: [
        {
          text: (msg.text || "").toString(),
        },
      ],
    }));

    // Últimas 30 transações para contexto (nunca mais que isso)
    const transactionsForContext = (input.allTransactions || []).slice(0, 30);
    let transactionsJSON = "[]";
    try {
      transactionsJSON = JSON.stringify(transactionsForContext, null, 2);
    } catch (e) {
      transactionsJSON = "[]";
    }

    // ---------------------------
    // 2) Prompt dinâmico
    // ---------------------------
    const promptContext = [
      LUMINA_BASE_PROMPT,
      // Adiciona o prompt de comando de voz se a entrada for de áudio
      audioText ? LUMINA_VOICE_COMMAND_PROMPT : "",
      // Adiciona o prompt de síntese de voz se o TTS estiver ativo
      isTTSActive ? LUMINA_SPEECH_SYNTHESIS_PROMPT : "",
      "",
      "### CONTEXTO SISTEMA (não repita literalmente ao usuário):",
      `- Modo Casal: ${input.isCoupleMode ? "Ativado" : "Desativado"}`,
      `- Transações recentes (últimas ${transactionsForContext.length}):`,
      transactionsJSON,
      audioText ? `- Áudio transcrito: ${audioText}` : "- Áudio transcrito: N/A",
      "",
      "### NOVA MENSAGEM DO USUÁRIO:",
      userQuery || "(mensagem vazia)",
      "",
      "Responda como Lúmina: seja humana, proativa, útil, nunca mostre erros técnicos e sempre termine com uma pergunta para engajar o usuário.",
    ].join("\n");

    // ---------------------------
    // 3) Attachments (imagem em base64)
    // ---------------------------
    let attachments: GenerationCommon["attachments"] = undefined;
    if (input.imageBase64) {
      const value = input.imageBase64 as string;
      const isDataUrl = /^data:.*;base64,/.test(value.trim());
      const mediaUrl = isDataUrl
        ? value.trim()
        : `data:image/png;base64,${value.trim()}`;

      attachments = [
        {
          media: {
            url: mediaUrl,
            contentType: "image/png",
          },
        },
      ];
    }

    // ---------------------------
    // 4) Chamada ao Gemini via Genkit
    // ---------------------------
    let apiResponse: any;
    try {
      apiResponse = await ai.generate({
        model: "googleai/gemini-1.5-flash", // ou gemini-1.5-pro se preferir
        prompt: promptContext,
        history: mappedChatHistory, // Histórico enviado da forma correta (única)
        attachments,
        output: {
          schema: LuminaChatOutputSchema,
        },
      });
    } catch (err) {
      console.error("Erro ao chamar Gemini:", err);
      return {
        text: "Tive um pequeno tropeço agora, mas já estou de volta! Pode repetir ou me dizer como posso te ajudar?",
        suggestions: [
          "Resumo do mês",
          "Registrar despesa da foto",
          "Comparar renda × gastos",
        ],
      };
    }

    // ---------------------------
    // 5) Normalização da resposta
    // ---------------------------
    const output = apiResponse?.output;

    if (!output?.text) {
      return {
        text: "Entendi sua mensagem! Quer que eu registre ou analise algo específico agora?",
        suggestions: [
          "Ver despesas do mês",
          "Sugestões para economizar",
          "Registrar despesa detectada",
        ],
      };
    }

    return {
      text: output.text,
      suggestions: output.suggestions || [],
    } as LuminaChatOutput;
  }
);
