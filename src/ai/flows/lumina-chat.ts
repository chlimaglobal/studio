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
    role: msg.role === "lumina" || msg.role === "model" ? "model" as const : "user" as const,
    content: [{ text: (msg.text || '').toString() }],
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

    // Memoriza automaticamente cada mensagem
    if (input.userQuery) {
      await updateMemoryFromMessage(userId, input.userQuery);
    }

    let apiResponse;

    try {
      const messages = [
        ...(input.prebuiltHistory || []),
        {
          role: "user" as const,
          content: [
            { text: input.prebuiltPrompt || "" },
            ...(input.prebuiltAttachments || []).map((att: any) => ({
              media: att.media,
            })),
          ],
        },
      ];

      apiResponse = await ai.generate({
        model: "googleai/gemini-1.5-flash",
        // @ts-ignore
        messages: messages,
        output: { schema: LuminaChatOutputSchema },
      });

    } catch (err) {
      console.error("Erro Gemini:", err);
      return {
        text: "Hmm… dei uma escorregada agora, mas já voltei! O que você queria fazer mesmo?",
        suggestions: ["Resumo financeiro", "Registrar despesa", "Ver desempenho do mês"],
      };
    }

    const output = apiResponse?.output;

    if (!output?.text) {
      return {
        text: "Entendi! Quer que eu analise algo ou registre alguma coisa para você?",
        suggestions: ["Despesas", "Receitas", "Comparar mês atual"],
      };
    }

    return {
      text: output.text,
      suggestions: output.suggestions || [],
    };
  }
);
