

"use server";

import type { LuminaChatInput, LuminaChatOutput } from "@/lib/types";
import {
  LUMINA_BASE_PROMPT,
  LUMINA_VOICE_COMMAND_PROMPT,
  LUMINA_SPEECH_SYNTHESIS_PROMPT,
} from "@/ai/lumina/prompt/luminaBasePrompt";
import { getUserMemory, saveUserMemory } from "@/ai/lumina/memory/memoryStore";
import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { LuminaChatInputSchema, LuminaChatOutputSchema } from '@/lib/types';
import { googleAI } from '@genkit-ai/google-genai';


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

(Use isso para responder melhor, mas NUNCA exponha ao usuário.)
`;
}

async function updateMemoryFromMessage(userId: string, text: string) {
  const toSave: any = {};

  if (/prefiro/i.test(text) || /gosto de/i.test(text)) {
    toSave.preferences = { lastPreference: text };
  }
  if (/não fale/i.test(text) || /não gosto que você/i.test(text)) {
    toSave.dontSay = [text];
  }
  if (/\bgasto\b/i.test(text) || /\bdespesa\b/i.test(text)) {
    toSave.financialHabits = { lastMention: text };
  }
  if (text.length > 10) {
    toSave.facts = { lastFact: text };
  }

  if (Object.keys(toSave).length > 0) {
    await saveUserMemory(userId, toSave);
  }
}

async function generateSuggestion(
  input: LuminaChatInput,
): Promise<{ prompt: string; history: any[]; attachments: any[] }> {
  const userId = input.user?.uid || "default";
  const userQuery = (input.userQuery || "").trim();
  const audioText = (input.audioText || "").trim();
  const isTTSActive = input.isTTSActive || false;

  const mappedChatHistory = (input.messages || []).map((msg: any) => ({
    role: msg.role === "assistant" || msg.role === "model" ? "model" : "user",
    parts: [{ text: msg.content || "" }],
  }));

  const transactionsForContext = (input.allTransactions || []).slice(0, 30);
  const transactionsJSON = JSON.stringify(transactionsForContext, null, 2);

  const memoryContext = await buildMemoryContext(userId);

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
    "Responda como Lúmina: humana, emocional, amigável, inteligente, sem mostrar erros técnicos. Sempre termine com uma pergunta.",
  ].join("\n");

  let attachments: any[] = [];
  if (input.imageBase64) {
    const url = /^data:.*;base64/.test(input.imageBase64)
      ? input.imageBase64
      : `data:image/png;base64,${input.imageBase64}`;
    attachments = [{ media: { url, contentType: "image/png" } }];
  }

  return { prompt: promptContext, history: mappedChatHistory, attachments };
}

// O schema do Zod foi simplificado para o que é realmente passado pela API.
const LuminaFlowInputSchema = LuminaChatInputSchema.extend({
  messages: z.array(z.any()).optional(), // O histórico do chat vem aqui.
});

export const luminaChatFlow = ai.defineFlow(
  {
    name: "luminaChatFlow",
    inputSchema: LuminaFlowInputSchema,
    outputSchema: LuminaChatOutputSchema,
  },
  async (input) => {
    const userId = input.user?.uid || 'default';

    if (input.userQuery) {
      await updateMemoryFromMessage(userId, input.userQuery);
    }

    try {
      const { prompt: systemPrompt, history: prebuiltHistory, attachments } = await generateSuggestion(input as LuminaChatInput);

      const genAI = googleAI();
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: systemPrompt,
      });

      const chat = model.startChat({
        history: prebuiltHistory,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
      });

      // Se tiver imagem, adiciona à última mensagem do usuário
      const lastUserMessageParts = [
          { text: input.userQuery || '' }
      ];
      if (attachments && attachments.length > 0) {
          attachments.forEach((att: any) => {
              if (att.media?.url) {
                  lastUserMessageParts.push({
                      inlineData: {
                          mimeType: att.media.contentType || 'image/png',
                          data: att.media.url.replace(/^data:image\/[a-z]+;base64,/, ''),
                      }
                  });
              }
          });
      }

      const result = await chat.sendMessage(lastUserMessageParts);
      const response = result.response;
      const text = response.text() || "Tudo bem! Como posso te ajudar hoje?";

      return {
        text,
        suggestions: [], 
      };

    } catch (err: any) {
      console.error("ERRO GEMINI:", err.message);

      return {
        text: "Desculpa, estou com um probleminha técnico agora... Mas posso te ajudar com um resumo rápido dos seus gastos ou te dar uma dica de economia enquanto isso arruma?",
        suggestions: ["Resumo do mês", "Maiores gastos", "Quanto economizei?"],
      };
    }
  }
);
