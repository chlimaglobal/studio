// src/ai/flows/lumina-chat.ts
'use server';

/**
 * @fileOverview Lúmina — fluxo de chat para interações individuais.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { LuminaChatInput, LuminaChatOutput } from '@/lib/types';
import { LuminaChatInputSchema, LuminaChatOutputSchema } from '@/lib/types';
import { LUMINA_BASE_PROMPT, LUMINA_VOICE_COMMAND_PROMPT } from '@/ai/lumina/prompt/luminaBasePrompt';
import { getUserMemory, saveUserMemory } from '../lumina/memory/memoryStore';
import { GenerationCommon } from 'genkit/generate';

const memoryExtractionPrompt = `
  Você é um assistente que extrai fatos e preferências da conversa.
  Analise o texto e retorne um objeto JSON com:
  - preferences: { key: value }
  - facts: { key: value }
  - dontSay: ["frase 1", "frase 2"]

  Texto: "{QUERY}"
`;

async function updateMemoryFromMessage(userId: string, message: string) {
  // Simples verificação para não rodar em mensagens triviais
  if (message.length < 15) return;

  try {
    const { output } = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        prompt: memoryExtractionPrompt.replace('{QUERY}', message),
        output: {
            format: 'json',
            schema: z.object({
                preferences: z.record(z.any()).optional(),
                facts: z.record(z.any()).optional(),
                dontSay: z.array(z.string()).optional(),
            })
        },
        config: { temperature: 0.1 }
    });
    
    if (output) {
      await saveUserMemory(userId, output);
    }
  } catch (error) {
    console.warn("LUMINA_MEMORY: Failed to update memory.", error);
  }
}

// === Função externa chamada pela aplicação ===
export async function generateSuggestion(input: LuminaChatInput, returnPrompt?: boolean): Promise<LuminaChatOutput | { prompt: string, history: any[], attachments: GenerationCommon["attachments"] }> {
  
  const baseHistory = (input.chatHistory || [])
    .filter(msg => msg.text) // Garante que não há mensagens de texto vazias
    .map((msg) => ({
      role: msg.role === 'lumina' ? 'model' : ('user' as 'user' | 'model'),
      content: [
        { text: msg.text || '' },
      ],
    }));
  
  const transactionsForContext = (input.allTransactions || []).slice(0, 30);
  const memory = await getUserMemory(input.user.uid);

  let promptContext = [
    LUMINA_BASE_PROMPT,
  ];
  
  // Adiciona contexto de voz se aplicável
  if (input.audioText) {
      promptContext.push(LUMINA_VOICE_COMMAND_PROMPT);
  }

  promptContext.push(
    '### INSTRUÇÕES ADICIONAIS:',
    '- MODO INDIVIDUAL ATIVADO',
    `- Usuário: ${input.user.displayName}`,
    `### Transações Recentes (para contexto): ${JSON.stringify(transactionsForContext, null, 2)}`,
    memory?.facts ? `### Fatos sobre o usuário (use isso): ${JSON.stringify(memory.facts)}` : '',
    memory?.preferences ? `### Preferências do usuário (respeite isso): ${JSON.stringify(memory.preferences)}` : '',
    memory?.dontSay ? `### O que NÃO dizer (evite a todo custo): ${JSON.stringify(memory.dontSay)}` : '',
    '---',
  );

  const finalSystemPrompt = promptContext.filter(Boolean).join('\n');
  
  let attachments: GenerationCommon["attachments"] | undefined = undefined;
  if (input.imageBase64) {
      attachments = [{ media: { url: input.imageBase64, contentType: 'image/png' } }];
  }

  if (returnPrompt) {
      return {
          prompt: finalSystemPrompt,
          history: baseHistory,
          attachments: attachments,
      };
  }

  // Se não for para retornar o prompt, executa o flow
  return luminaChatFlow({ ...input, prebuiltPrompt: finalSystemPrompt, prebuiltHistory: baseHistory, prebuiltAttachments: attachments });
}

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
