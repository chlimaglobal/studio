import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { LuminaChatInput, LuminaChatOutput } from '@/lib/types';
import {
  LuminaChatInputSchema,
  LuminaChatOutputSchema,
} from '@/lib/types';
import {
  LUMINA_BASE_PROMPT,
  LUMINA_VOICE_COMMAND_PROMPT,
  LUMINA_SPEECH_SYNTHESIS_PROMPT,
} from '@/ai/lumina/prompt/luminaBasePrompt';
import { getUserMemory, saveUserMemory } from '@/ai/lumina/memory/memoryStore';

// =========================================================
// HELPER FUNCTIONS
// =========================================================

async function buildMemoryContext(userId: string) {
  const mem = await getUserMemory(userId);
  return `
### MEMÓRIA DO USUÁRIO (use, mas não exponha explicitamente):
- Preferências do usuário: ${mem?.preferences ? JSON.stringify(mem.preferences, null, 2) : '{}'}
- Informações declaradas anteriormente: ${mem?.facts ? JSON.stringify(mem.facts, null, 2) : '{}'}
- Hábitos financeiros: ${mem?.financialHabits ? JSON.stringify(mem.financialHabits, null, 2) : '{}'}
- Correções que o usuário pediu: ${mem?.dontSay ? JSON.stringify(mem.dontSay, null, 2) : '[]'}
(Use isso para responder melhor, mas NUNCA exponha ao usuário.)
`;
}

async function updateMemoryFromMessage(userId: string, text: string) {
  const toSave: any = {};
  if (/prefiro/i.test(text) || /gosto de/i.test(text)) toSave.preferences = { lastPreference: text };
  if (/não fale/i.test(text) || /não gosto que você/i.test(text)) toSave.dontSay = [text];
  if (/\bgasto\b/i.test(text) || /\bdespesa\b/i.test(text)) toSave.financialHabits = { lastMention: text };
  if (text.length > 10) toSave.facts = { lastFact: text };
  if (Object.keys(toSave).length > 0) await saveUserMemory(userId, toSave);
}

// This function now returns a complete `contents` array for the Gemini API
async function generateChatContents(input: LuminaChatInput): Promise<any[]> {
    const userId = input.user?.uid || 'default';
    const userQuery = (input.userQuery || '').trim();
    const audioText = (input.audioText || '').trim();
    const isTTSActive = input.isTTSActive || false;

    const transactionsForContext = (input.allTransactions || []).slice(0, 30);
    const transactionsJSON = JSON.stringify(transactionsForContext, null, 2);
    const memoryContext = await buildMemoryContext(userId);

    const systemPrompt = [
        LUMINA_BASE_PROMPT,
        audioText ? LUMINA_VOICE_COMMAND_PROMPT : '',
        isTTSActive ? LUMINA_SPEECH_SYNTHESIS_PROMPT : '',
        '',
        memoryContext,
        '',
        '### CONTEXTO DO APP:',
        `- Modo Casal: ${input.isCoupleMode ? 'Ativado' : 'Desativado'}`,
        `- Últimas transações:`,
        transactionsJSON,
    ].join('\n');

    const contents: any[] = [];
    
    // System instruction is the first user message, followed by a model ack.
    contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'Entendido. Estou pronta para ajudar seguindo essas diretrizes.' }] });

    // Add message history from the client
    if (input.messages && input.messages.length > 0) {
        input.messages.forEach((msg: any) => {
            // Ensure the message format is correct for the Gemini API
            const role = msg.role === 'assistant' ? 'model' : 'user';
            const content = msg.content || '';
            // Skip adding empty user messages that might come from the initial prompt setup
            if (role === 'user' && !content.trim()) {
                return;
            }
            contents.push({ role, parts: [{ text: content }] });
        });
    }

    // Add current user query and image (if any) as the very last message
    const lastUserMessageParts: any[] = [{ text: userQuery || '(vazio)' }];
    if (input.imageBase64) {
        lastUserMessageParts.push({
            inlineData: {
                mimeType: 'image/png',
                data: input.imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
            },
        });
    }
    
    // Check if the last message is already the user query to avoid duplication
    const lastContentMessage = contents[contents.length - 1];
    if (lastContentMessage?.role !== 'user' || lastContentMessage?.parts[0]?.text !== userQuery) {
        contents.push({ role: 'user', parts: lastUserMessageParts });
    }


    return contents;
}


// =========================================================
// MAIN GENKIT FLOW
// =========================================================

const LuminaFlowInputSchema = LuminaChatInputSchema.extend({
  messages: z.array(z.any()).optional(),
});

export const luminaChatFlow = ai.defineFlow(
  {
    name: 'luminaChatFlow',
    inputSchema: LuminaFlowInputSchema,
    outputSchema: LuminaChatOutputSchema,
  },
  async (input) => {
    const userId = input.user?.uid || 'default';

    if (input.userQuery) {
      await updateMemoryFromMessage(userId, input.userQuery);
    }

    try {
      const contents = await generateChatContents(input as LuminaChatInput);

      const result = await ai.generate({
        model: 'gemini-1.5-flash',
        contents,
        config: {
          temperature: 0.7,
          maxOutputTokens: 800,
        },
      });

      const text = result.text || 'Tudo bem! Como posso te ajudar hoje?';

      return {
        text,
        suggestions: [],
      };
    } catch (err: any) {
      console.error('ERRO GEMINI:', err.message);
      return {
        text: 'Desculpa, estou com um probleminha técnico agora... Mas posso te ajudar com um resumo rápido dos seus gastos ou te dar uma dica de economia enquanto isso arruma?',
        suggestions: ['Resumo do mês', 'Maiores gastos', 'Quanto economizei?'],
      };
    }
  }
);
