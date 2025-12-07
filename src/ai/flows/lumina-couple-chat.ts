
'use server';

import { defineFlow } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import type { LuminaCoupleChatInput, LuminaChatOutput } from '@/lib/types';
import { LuminaCoupleChatInputSchema, LuminaChatOutputSchema } from '@/lib/types';
import { LUMINA_BASE_PROMPT } from '@/ai/lumina/prompt/luminaBasePrompt';
import { LUMINA_COUPLE_PROMPT } from '@/ai/lumina/prompt/luminaCouplePrompt';
import { generate } from 'genkit/ai';

export const generateCoupleSuggestion = defineFlow(
  {
    name: 'luminaCoupleChatFlow',
    inputSchema: LuminaCoupleChatInputSchema,
    outputSchema: LuminaChatOutputSchema,
  },
  async (input) => {
    
    const mappedChatHistory = (input.chatHistory || []).map((msg) => ({
      role: msg.role === 'lumina' ? 'model' : ('user' as 'user' | 'model'),
      parts: [{ text: (msg.text || '').toString() }],
    }));

    const transactionsForContext = (input.allTransactions || []).slice(0, 50);

    const promptContext = [
        LUMINA_BASE_PROMPT,
        LUMINA_COUPLE_PROMPT,
        '',
        '### CONTEXTO SISTEMA (não repita literalmente ao usuário):',
        '- MODO CASAL ATIVADO',
        `- Usuário Atual: ${input.user.displayName} (ID: ${input.user.uid})`,
        `- Parceiro(a): ${input.partner.displayName} (ID: ${input.partner.uid})`,
        `- Transações do casal (últimas ${transactionsForContext.length}):`,
        JSON.stringify(transactionsForContext, null, 2),
        input.audioText ? `- Áudio transcrito: ${input.audioText}` : '- Áudio transcrito: N/A',
        '',
        '### NOVA MENSAGEM DO USUÁRIO:',
        input.userQuery || '(mensagem vazia)',
        '',
        'Responda como Lúmina, dirigindo-se ao casal de forma inclusiva, humana e proativa. Sempre termine com uma pergunta para engajar a conversa.',
    ].join('\n');
    
    let promptParts: any[] = [{ text: promptContext }];
    if (input.imageBase64) {
        promptParts.push({ media: { url: `data:image/png;base64,${input.imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')}` } });
    }

    try {
        const result = await generate({
            model: googleAI('gemini-1.5-flash'),
            prompt: promptParts,
            history: mappedChatHistory,
            output: {
                format: 'json',
                schema: LuminaChatOutputSchema,
            },
            config: {
                retries: 3
            }
        });

      const output = result.output();
      if (!output || !output.text) {
        throw new Error("A Lúmina não retornou uma resposta válida para o casal.");
      }
      
      return output;

    } catch (err) {
      console.error("🔥 ERRO AO CHAMAR GEMINI (COUPLE):", err);
      return {
        text: "Tivemos uma pequena instabilidade, mas já estou de volta para ajudar vocês. Qual o próximo passo?",
        suggestions: [
          "Resumo das despesas do casal",
          "Quem gastou mais esse mês?",
          "Criar uma meta financeira juntos"
        ]
      };
    }
  }
);
