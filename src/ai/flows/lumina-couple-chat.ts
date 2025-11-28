
'use server';

/**
 * @fileOverview Lúmina — fluxo de chat para casais.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { LuminaCoupleChatInput, LuminaChatOutput } from '@/lib/types';
import { LuminaCoupleChatInputSchema, LuminaChatOutputSchema } from '@/lib/types';
import { LUMINA_BASE_PROMPT } from '@/ai/lumina/prompt/luminaBasePrompt';


// === Função externa chamada pela aplicação ===
export async function generateCoupleSuggestion(input: LuminaCoupleChatInput): Promise<LuminaChatOutput> {
  return luminaCoupleChatFlow(input);
}

const luminaCoupleChatFlow = ai.defineFlow(
  {
    name: 'luminaCoupleChatFlow',
    inputSchema: LuminaCoupleChatInputSchema,
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
    
    const mappedChatHistory = (input.chatHistory || []).map((msg) => ({
      role: msg.role === 'lumina' ? 'model' : ('user' as 'user' | 'model'),
      content: [
        {
          text: (msg.text || '').toString(),
        },
      ],
    }));

    const transactionsForContext = (input.allTransactions || []).slice(0, 50);

    const promptContext = [
        LUMINA_BASE_PROMPT,
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

    try {
        const { output } = await ai.generate({
            model: 'googleai/gemini-1.5-flash',
            prompt: promptContext,
            history: mappedChatHistory,
            output: {
                schema: LuminaChatOutputSchema,
            },
        });

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
