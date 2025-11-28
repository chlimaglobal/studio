'use server';

/**
 * Lúmina — fluxo oficial do assistente financeiro.
 * Compatível com imagens (base64), histórico e modo casal.
 */

import { ai } from '@/ai/genkit';
import type { LuminaChatInput, LuminaChatOutput } from '@/lib/types';
import { LuminaChatInputSchema, LuminaChatOutputSchema } from '@/lib/types';
import { LUMINA_BASE_PROMPT } from '@/ai/lumina/prompt/luminaBasePrompt';

export async function generateSuggestion(input: LuminaChatInput): Promise<LuminaChatOutput> {
  return luminaChatFlow(input);
}

const luminaChatFlow = ai.defineFlow(
  {
    name: 'luminaChatFlow',
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

    const userQuery = (input.userQuery || '').trim();
    const audioText = (input.audioText || '').trim();

    const mappedChatHistory = (input.chatHistory || []).map((msg) => ({
      role: msg.role === 'lumina' ? 'model' : ('user' as 'user' | 'model'),
      content: [
        {
          text: (msg.text || '').toString(),
        },
      ],
    }));

    const transactionsForContext = (input.allTransactions || []).slice(0, 30);
    let transactionsJSON = '[]';
    try {
      transactionsJSON = JSON.stringify(transactionsForContext, null, 2);
    } catch (e) {
      transactionsJSON = '[]';
    }

    // ---------------------------
    // 2) Construir prompt completo
    // ---------------------------
    const promptContext = [
      LUMINA_BASE_PROMPT,
      '',
      '### CONTEXTO SISTEMA (não repita literalmente ao usuário):',
      `- Modo Casal: ${input.isCoupleMode ? 'Ativado' : 'Desativado'}`,
      `- Transações (últimas ${transactionsForContext.length}):`,
      transactionsJSON,
      audioText ? `- Áudio transcrito: ${audioText}` : '- Áudio transcrito: N/A',
      '',
      '### NOVA MENSAGEM DO USUÁRIO:',
      userQuery || '(sem texto)',
      '',
      'RESPONDA como Lúmina obedecendo às regras: seja humana, proativa, NÃO RETORNE ERROS, entregue sugestões e ações financeiras, e sempre termine com uma pergunta para continuar a conversa.',
    ].join('\n');

    // ---------------------------
    // 3) Preparar attachments (imagem base64)
    // ---------------------------
    let attachments: Array<any> | undefined = undefined;
    if (input.imageBase64) {
      const value = input.imageBase64 as string;
      const isDataUrl = /^data:.*;base64,/.test(value.trim());
      const mediaUrl = isDataUrl ? value.trim() : `data:image/png;base64,${value.trim()}`;

      attachments = [
        {
          media: {
            url: mediaUrl,
            contentType: 'image/png',
          },
        },
      ];
    }

    // ---------------------------
    // 4) Chamada ao Genkit / Gemini
    // ---------------------------
    let apiResponse: any;
    try {
      apiResponse = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        prompt: promptContext,
        history: mappedChatHistory,
        attachments,
        output: {
          schema: LuminaChatOutputSchema,
        },
      });
    } catch (err) {
      console.error('🔥 ERRO AO CHAMAR GENIE/GEMINI:', err);
      // Resposta segura — nunca vazar erro para o usuário
      return {
        text: "Tive uma instabilidade momentânea ao analisar sua mensagem, mas já recuperei tudo. Diga novamente: como posso te ajudar agora?",
        suggestions: [
          "Resumo do mês",
          "Registrar uma despesa a partir da foto",
          "Comparar renda vs gastos"
        ],
      };
    }

    // ---------------------------
    // 5) Normalizar resposta
    // ---------------------------
    const output = apiResponse?.output;
    if (!output || !output.text) {
      return {
        text: "Recebi sua mensagem e já comecei a análise — me diga se quer que eu registre automaticamente as sugestões que eu trouxer.",
        suggestions: [
          "Ver minhas despesas do mês",
          "Me ajude a reduzir gastos",
          "Registrar despesa detectada"
        ],
      };
    }

    return {
      text: output.text || "Aqui está o que eu encontrei. Quer que eu registre?",
      suggestions: output.suggestions || [],
    } as LuminaChatOutput;
  }
);
