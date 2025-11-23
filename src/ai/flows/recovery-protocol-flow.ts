
'use server';

/**
 * @fileOverview An AI agent to generate a high-performance financial recovery plan.
 *
 * - runRecoveryProtocol - A function that analyzes transactions and provides a strategic turnaround plan.
 * - RecoveryProtocolInput - The input type for the function.
 * - RecoveryProtocolOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const RecoveryProtocolInputSchema = z.object({
  transactions: z.array(z.any()).describe('A lista de transações do usuário (receitas e despesas) do período a ser analisado.'),
  promptType: z.enum(['full', 'flash']).default('full'),
});

export type RecoveryProtocolInput = z.infer<typeof RecoveryProtocolInputSchema>;

const RecoveryProtocolOutputSchema = z.object({
    inefficiencyPoint: z.string().describe("Análise objetiva dos pontos de ineficiência e desperdício."),
    missedDecisions: z.string().describe("Decisões estratégicas que não foram tomadas."),
    wastedOpportunities: z.string().describe("Oportunidades de otimização ou ganho que foram ignoradas."),
    highPerformerActions: z.string().describe("As ações imediatas (próximas 48h) que um indivíduo de alta performance executaria."),
    recoveryPlan: z.string().describe("O plano de ação mais curto e eficaz para garantir um resultado positivo no próximo mês."),
    warMantra: z.string().describe("Um mantra de guerra, objetivo e motivacional, para foco e execução."),
});

const FlashRecoveryOutputSchema = z.object({
    failureSummary: z.string().describe("Um resumo de 1 parágrafo sobre onde a falha ocorreu."),
    actionNow: z.string().describe("Um resumo de 1 parágrafo sobre o que deve ser feito imediatamente."),
    warMantra: z.string().describe("Um mantra de guerra, estilo ENTJ, para reprogramação mental."),
});

export type RecoveryProtocolOutput = z.infer<typeof RecoveryProtocolOutputSchema>;
export type FlashRecoveryOutput = z.infer<typeof FlashRecoveryOutputSchema>;

// Unified wrapper function
export async function runRecoveryProtocol(input: RecoveryProtocolInput) {
    if (input.promptType === 'flash') {
        return runFlashRecoveryProtocolFlow(input);
    }
    return runFullRecoveryProtocolFlow(input);
}

// FULL PROTOCOL FLOW
const fullPrompt = ai.definePrompt({
  name: 'fullRecoveryProtocolPrompt',
  input: { schema: RecoveryProtocolInputSchema },
  output: { schema: RecoveryProtocolOutputSchema },
  model: 'googleai/gemini-2.5-flash',
  prompt: `Você é uma I.A. de análise estratégica, operando como uma conselheira para um líder (usuário) que encerrou um período financeiro com performance negativa. Sua resposta deve ser fria, direta, impessoal e focada exclusivamente em estratégia, dados e execução. Abandone qualquer tom de acolhimento emocional.

Comando recebido: "Lúmina, acione o Protocolo de Recuperação de Performance."

Sua missão é analisar os dados de transações fornecidos e entregar um relatório tático com os seguintes pontos:

1.  **Diagnóstico de Ineficiência:** Analise os gastos. Identifique as 3 principais categorias que drenaram recursos e aponte onde a alocação de capital falhou. Seja específico. Exemplo: "Seu capital foi ineficiente alocado em 'Delivery' e 'Transporte por App', consumindo 25% da sua receita líquida sem gerar retorno ou ativo."

2.  **Decisões Omitidas:** Com base na distribuição de gastos, identifique as decisões cruciais que foram ignoradas. Exemplo: "Você omitiu a decisão de estabelecer um teto de gastos para categorias não essenciais. Faltou um sistema de controle."

3.  **Oportunidades Desperdiçadas:** Aponte as oportunidades de otimização que foram perdidas. Exemplo: "Você desperdiçou a oportunidade de converter X% da receita em aportes para a reserva de emergência, o que teria fortalecido sua posição defensiva."

4.  **Ação de Alta Performance (Próximas 48 Horas):** Defina o que um executor de elite faria imediatamente. Exemplo: "1. Auditoria de todas as assinaturas recorrentes e cancelamento de no mínimo duas. 2. Definição de um orçamento base-zero para a próxima semana. 3. Transferência imediata de X% do saldo atual para uma conta de investimento separada."

5.  **Plano de Recuperação (Próximo Mês):** Forneça o plano mais curto e brutalmente eficaz para garantir superávit. Exemplo: "1. Redução de 50% em gastos com 'Lazer' e 'Restaurantes'. 2. Alocação compulsória dos primeiros 15% de toda receita para a meta 'Resultado Positivo'. 3. Duas fontes de micro-renda serão exploradas, com meta de R$300."

6.  **Mantra de Guerra:** Finalize com um mantra objetivo para focar a mente em execução e disciplina. Exemplo: "Eficiência é a métrica. O resto é ruído."

**Dados das Transações para Análise:**
{{{json transactions}}}

Execute a análise e retorne o resultado no formato JSON solicitado. Sem emoção. Apenas estratégia.`,
});

const runFullRecoveryProtocolFlow = ai.defineFlow(
  {
    name: 'runFullRecoveryProtocolFlow',
    inputSchema: RecoveryProtocolInputSchema,
    outputSchema: RecoveryProtocolOutputSchema,
  },
  async (input) => {
    const { output } = await fullPrompt(input);
    if (!output) {
      throw new Error('O Protocolo de Recuperação não pôde ser executado.');
    }
    return output;
  }
);


// FLASH PROTOCOL FLOW
const flashPrompt = ai.definePrompt({
    name: 'flashRecoveryProtocolPrompt',
    input: { schema: RecoveryProtocolInputSchema },
    output: { schema: FlashRecoveryOutputSchema },
    model: 'googleai/gemini-2.5-flash',
    prompt: `Você é uma I.A. de comando estratégico. Responda ao comando "Lúmina, modo flash" para um usuário que busca uma análise financeira rápida e direta. Tom de voz: ENTJ, focado em resultados, sem rodeios.

    **Análise de Falha (1 Parágrafo):** Analise as transações. Identifique a causa raiz da performance negativa. Foque na maior fonte de dreno de capital e na principal falha de disciplina. Seja direto.

    **Ação Imediata (1 Parágrafo):** Defina o plano de ação mais crítico e imediato. O que precisa ser feito AGORA para reverter o quadro. Ordens claras e executáveis.

    **Mantra de Reprogramação:** Forneça um mantra de comando, curto e poderoso, para realinhar o foco mental do usuário para a vitória.

    **Dados das Transações para Análise:**
    {{{json transactions}}}

    Execute a análise e retorne o resultado no formato JSON solicitado.`,
});


const runFlashRecoveryProtocolFlow = ai.defineFlow(
  {
    name: 'runFlashRecoveryProtocolFlow',
    inputSchema: RecoveryProtocolInputSchema,
    outputSchema: FlashRecoveryOutputSchema,
  },
  async (input) => {
    const { output } = await flashPrompt(input);
    if (!output) {
      throw new Error('O Protocolo Flash não pôde ser executado.');
    }
    return output;
  }
);
