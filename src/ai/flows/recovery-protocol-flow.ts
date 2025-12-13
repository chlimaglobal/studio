
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { LUMINA_RECOVERY_PROMPT } from '@/ai/lumina/prompt/luminaRecoveryPrompt';
import { googleAI } from '@genkit-ai/google-genai';
import { RecoveryProtocolInputSchema, RecoveryProtocolOutputSchema, FlashRecoveryOutputSchema } from '@/lib/definitions';

// FULL PROTOCOL FLOW
const runFullRecoveryProtocolFlow = ai.defineFlow(
  {
    name: 'runFullRecoveryProtocolFlow',
    inputSchema: RecoveryProtocolInputSchema,
    outputSchema: RecoveryProtocolOutputSchema,
  },
  async (input) => {
    const prompt = LUMINA_RECOVERY_PROMPT + `
      ---
      **Dados das Transações para Análise:**
      ${JSON.stringify(input.transactions)}

      Execute a análise e retorne o resultado no formato JSON solicitado. Sem emoção. Apenas estratégia.`;

    const result = await ai.generate({
        model: googleAI.model('gemini-1.5-flash'),
        prompt: prompt,
        output: {
            format: 'json',
            schema: RecoveryProtocolOutputSchema
        }
    });

    const output = result.output;
    if (!output) {
      throw new Error('O Protocolo de Recuperação não pôde ser executado.');
    }
    return output;
  }
);

// FLASH PROTOCOL FLOW
const runFlashRecoveryProtocolFlow = ai.defineFlow(
  {
    name: 'runFlashRecoveryProtocolFlow',
    inputSchema: RecoveryProtocolInputSchema,
    outputSchema: FlashRecoveryOutputSchema,
  },
  async (input) => {
     const prompt = `Você é uma I.A. de comando estratégico. Responda ao comando "Lúmina, modo flash" para um usuário que busca uma análise financeira rápida e direta. Tom de voz: ENTJ, focado em resultados, sem rodeios.

    **Análise de Falha (1 Parágrafo):** Analise as transações. Identifique a causa raiz da performance negativa. Foque na maior fonte de dreno de capital e na principal falha de disciplina. Seja direto.

    **Ação Imediata (1 Parágrafo):** Defina o plano de ação mais crítico e imediato. O que precisa ser feito AGORA para reverter o quadro. Ordens claras e executáveis.

    **Mantra de Reprogramação:** Forneça um mantra de comando, curto e poderoso, para realinhar o foco mental do usuário para a vitória.

    **Dados das Transações para Análise:**
    ${JSON.stringify(input.transactions)}

    Execute a análise e retorne o resultado no formato JSON solicitado.`;

     const result = await ai.generate({
        model: googleAI.model('gemini-1.5-flash'),
        prompt: prompt,
        output: {
            format: 'json',
            schema: FlashRecoveryOutputSchema
        }
    });
    
    const output = result.output;
    if (!output) {
      throw new Error('O Protocolo Flash não pôde ser executado.');
    }
    return output;
  }
);

// This is the main exported flow that will be called.
export const runRecoveryProtocol = ai.defineFlow(
  {
    name: 'runRecoveryProtocol',
    inputSchema: RecoveryProtocolInputSchema,
    outputSchema: z.union([RecoveryProtocolOutputSchema, FlashRecoveryOutputSchema])
  },
  async (input) => {
    if (input.promptType === 'flash') {
        return runFlashRecoveryProtocolFlow(input);
    }
    return runFullRecoveryProtocolFlow(input);
  }
);
