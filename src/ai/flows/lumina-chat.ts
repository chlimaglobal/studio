"use server";

import { ai } from "@/ai/genkit";
import type { LuminaChatInput, LuminaChatOutput } from "@/lib/types";
import { LuminaChatInputSchema, LuminaChatOutputSchema } from "@/lib/types";

import {
  LUMINA_BASE_PROMPT,
  LUMINA_VOICE_COMMAND_PROMPT,
  LUMINA_SPEECH_SYNTHESIS_PROMPT,
} from "@/ai/lumina/prompt/luminaBasePrompt";

import { z } from "zod";
import { getUserMemory, saveUserMemory } from "@/ai/lumina/memory/memoryStore";


// =========================================================
// 1) CARREGA MEMÓRIA DO USUÁRIO
// =========================================================
async function buildMemoryContext(userId: string) {
  const mem = await getUserMemory(userId);

  return `
### MEMÓRIA DO USUÁRIO (use, mas não exponha explicitamente):

- Preferências do usuário:
${mem?.preferences ? JSON.stringify(mem.preferences, null, 2) : "{}"}

- Informações declaradas anteriormente:
${mem?.facts ? JSON.stringify(mem.facts, null, 2) : "{}"}

- Hábitos financeiros:
${mem?.financialHabits ? JSON.stringify(mem.financialHabits, null, 2) : "{}"}

- Correções que o usuário pediu:
${mem?.dontSay ? JSON.stringify(mem.dontSay, null, 2) : "[]"}

(Use isso para responder melhor, mas NUNCA expose ao usuário.)
`;
}


// =========================================================
// 2) ATUALIZA MEMÓRIA AUTOMATICAMENTE
// =========================================================
async function updateMemoryFromMessage(userId: string, text: string) {
  const toSave: any = {};

  // Preferências gerais
  if (/prefiro/i.test(text) || /gosto de/i.test(text)) {
    toSave.preferences = { lastPreference: text };
  }

  // Correção de comportamento
  if (/não fale/i.test(text) || /não gosto que você/i.test(text)) {
    toSave.dontSay = [text];
  }

  // Hábitos financeiros
  if (/\bgasto\b/i.test(text) || /\bdespesa\b/i.test(text)) {
    toSave.financialHabits = { lastMention: text };
  }

  // Fatos gerais
  if (text.length > 10) {
    toSave.facts = { lastFact: text };
  }

  await saveUserMemory(userId, toSave);
}



// =========================================================
// 3) FUNÇÃO PRINCIPAL generateSuggestion
// =========================================================
export async function generateSuggestion(
  input: LuminaChatInput,
  returnPromptOnly = false
): Promise<LuminaChatOutput | { prompt: string; history: any[]; attachments: any[] }> {

  const userId = input.user?.uid || "default";
  const userQuery = (input.userQuery || "").trim();
  const audioText = (input.audioText || "").trim();
  const isTTSActive = input.isTTSActive || false;

  // Mapeia histórico
  const mappedChatHistory = (input.chatHistory || []).map((msg) => ({
    role: msg.role === "lumina" || msg.role === 'assistant' || msg.role === 'model' ? "model" as const : "user" as const,
    content: [{ text: (msg.content || msg.text || '').toString() }],
  }));

  // Transações recentes
  const transactionsForContext = (input.allTransactions || []).slice(0, 30);
  const transactionsJSON = JSON.stringify(transactionsForContext, null, 2);

  // Memória carregada
  const memoryContext = await buildMemoryContext(userId);

  // Prompt final
  const promptContext = [
    LUMINA_BASE_PROMPT,
    audioText ? LUMINA_VOICE_COMMAND_PROMPT : "",
    isTTSActive ? LUMINA_SPEECH_SYNTHESIS_PROMPT : "",
    "",
    memoryContext,
    "",
    "### CONTEXTO DO APP:",
    `- Modo Casal: ${input.isCoupleMode ? "Ativado" : "Desativado"}`,
    `- Últimas transações:`,
    transactionsJSON,
    audioText ? `- Áudio transcrito: ${audioText}` : "",
    "",
    "### NOVA MENSAGEM DO USUÁRIO:",
    userQuery || "(vazio)",
    "",
    "Responda como Lúmina: humana, emocional, amigável, inteligente, sem mostrar erros técnicos. Sempre termine com uma pergunta."
  ].join("\n");

  // Attachments
  let attachments: any[] = [];
  if (input.imageBase64) {
    const url = /^data:.*;base64/.test(input.imageBase64)
      ? input.imageBase64
      : `data:image/png;base64,${input.imageBase64}`;

    attachments = [
      { media: { url, contentType: "image/png" } }
    ];
  }

  if (returnPromptOnly) {
    return {
      prompt: promptContext,
      history: mappedChatHistory,
      attachments,
    };
  }

  return luminaChatFlow({
    ...input,
    prebuiltPrompt: promptContext,
    prebuiltHistory: mappedChatHistory,
    prebuiltAttachments: attachments,
  });
}



// =========================================================
// 4) FLOW FINAL – CHAMADA DO GEMINI
// =========================================================
export const luminaChatFlow = ai.defineFlow(
  {
    name: "luminaChatFlow",
    inputSchema: LuminaChatInputSchema.extend({
      prebuiltPrompt: z.string().optional(),
      prebuiltHistory: z.any().optional(),
      prebuiltAttachments: z.any().optional(),
    }),
    outputSchema: LuminaChatOutputSchema,
  },
  async (input) => {
    const userId = input.user?.uid || 'default';

    // Atualiza memória
    if (input.userQuery) {
      await updateMemoryFromMessage(userId, input.userQuery);
    }

    try {
      // MÉTODO CORRETO: mandar tudo como "contents" (histórico completo)
      const contents: any[] = [];

      // 1. Adiciona o prompt base como mensagem do system (primeira)
      if (input.prebuiltPrompt) {
        contents.push({
          role: "user",
          parts: [{ text: input.prebuiltPrompt }],
        });
        contents.push({
          role: "model",
          parts: [{ text: "Entendido! Vou seguir exatamente essas instruções." }],
        });
      }

      // 2. Adiciona o histórico real do chat
      if (input.prebuiltHistory && input.prebuiltHistory.length > 0) {
        contents.push(...input.prebuiltHistory);
      }

      // 3. Adiciona a última mensagem do usuário (a atual)
      if (input.userQuery) {
        contents.push({
          role: "user",
          parts: [{ text: input.userQuery }],
        });
      }

      // 4. Se tiver imagem, adiciona como inline data
      const mediaParts: any[] = [];
      if (input.prebuiltAttachments && input.prebuiltAttachments.length > 0) {
        input.prebuiltAttachments.forEach((att: any) => {
          if (att.media?.url) {
            mediaParts.push({
              inlineData: {
                mimeType: att.media.contentType || "image/png",
                data: att.media.url.replace(/^data:image\/[a-z]+;base64,/, ""),
              },
            });
          }
        });
      }

      // Se tiver imagem, adiciona na última mensagem do usuário
      if (mediaParts.length > 0 && contents.length > 0) {
        const lastUserMsg = contents[contents.length - 1];
        if (lastUserMsg.role === "user") {
          lastUserMsg.parts.push(...mediaParts);
        }
      }

      const result = await ai.generate({
        model: "googleai/gemini-1.5-flash",
        contents, // <--- AQUI ESTÁ A MÁGICA
        config: {
          temperature: 0.7,
          maxOutputTokens: 800,
        },
      });

      const text = result.text || "Tudo bem! Como posso te ajudar hoje?";

      return {
        text,
        suggestions: [], // você pode extrair depois se quiser
      };

    } catch (err: any) {
      console.error("ERRO GEMINI:", err.message);

      // Fallback melhorado
      return {
        text: "Desculpa, estou com um probleminha técnico agora... Mas posso te ajudar com um resumo rápido dos seus gastos ou te dar uma dica de economia enquanto isso arruma?",
        suggestions: ["Resumo do mês", "Maiores gastos", "Quanto economizei?"],
      };
    }
  }
);
