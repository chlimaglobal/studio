
'use server';

/**
 * @fileOverview Um agente de IA para mediar e alinhar metas financeiras de um casal.
 *
 * - mediateGoals - Uma função que analisa duas metas e propõe um plano conjunto.
 * - MediateGoalsInput - O tipo de entrada para a função.
 * - MediateGoalsOutput - O tipo de retorno para a função.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GoalSchema = z.object({
  description: z.string().describe("Descrição da meta (ex: 'Viagem de luxo para a Europa')."),
  amount: z.number().positive().describe("Valor total necessário para a meta."),
  months: z.number().int().positive().describe("Prazo em meses para alcançar a meta."),
});

export const MediateGoalsInputSchema = z.object({
  partnerAGoal: GoalSchema.describe("O objetivo financeiro do Parceiro A."),
  partnerBGoal: GoalSchema.describe("O objetivo financeiro do Parceiro B."),
  sharedMonthlySavings: z.number().positive().describe("O valor total que o casal pode economizar por mês."),
});
export type MediateGoalsInput = z.infer<typeof MediateGoalsInputSchema>;

const ActionStepSchema = z.object({
  title: z.string().describe("Um título curto para o passo de ação."),
  description: z.string().describe("Uma explicação detalhada do que precisa ser feito."),
});

export const MediateGoalsOutputSchema = z.object({
  summary: z.string().describe("Um resumo inspirador e neutro do plano conjunto, explicando como ele equilibra as duas metas."),
  jointPlan: z.object({
    partnerAPortion: z.number().describe("Valor mensal alocado para a meta do Parceiro A."),
    partnerBPortion: z.number().describe("Valor mensal alocado para a meta do Parceiro B."),
    unallocated: z.number().describe("Valor restante da economia mensal que não foi alocado."),
    partnerANewMonths: z.number().int().describe("O novo prazo em meses para a meta do Parceiro A com base na nova alocação."),
    partnerBNewMonths: z.number().int().describe("O novo prazo em meses para a meta do Parceiro B com base na nova alocação."),
  }),
  analysis: z.string().describe("Uma análise detalhada explicando a lógica por trás da sugestão, os prós e os contras do novo plano."),
  actionSteps: z.array(ActionStepSchema).describe("Uma lista de 2-3 passos práticos para o casal começar a seguir o plano."),
});
export type MediateGoalsOutput = z.infer<typeof MediateGoalsOutputSchema>;


export async function mediateGoals(input: MediateGoalsInput): Promise<MediateGoalsOutput> {
  return mediateGoalsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'mediateGoalsPrompt',
  input: { schema: MediateGoalsInputSchema },
  output: { schema: MediateGoalsOutputSchema },
  model: 'googleai/gemini-1.5-pro',
  prompt: `Você é a Lúmina, uma terapeuta e planejadora financeira especialista em casais. Sua missão é ajudar casais a alinhar suas metas financeiras, mesmo quando parecem conflitantes. Você deve ser empática, neutra e focada em soluções ganha-ganha.

  **Contexto:**
  Um casal tem uma capacidade de economia mensal compartilhada e duas metas individuais. Você precisa analisar as metas e a capacidade de economia para propor um plano conjunto equilibrado.

  **Informações Recebidas:**
  - **Economia Mensal do Casal:** {{{sharedMonthlySavings}}}
  - **Meta do Parceiro A:** {{{json partnerAGoal}}}
  - **Meta do Parceiro B:** {{{json partnerBGoal}}}

  **Sua Tarefa:**
  1.  **Analisar a Viabilidade:** Verifique se a soma dos aportes mensais necessários para cada meta individual (\`amount\` / \`months\`) ultrapassa a capacidade de economia mensal do casal (\`sharedMonthlySavings\`). Se não ultrapassar, o plano é viável como está, e você deve alocar os valores e calcular o tempo para cada um, explicando que ambos são possíveis simultaneamente. Se ultrapassar, um compromisso será necessário.

  2.  **Criar um Plano Conjunto (jointPlan):**
      - **Alocação Proporcional:** Como ponto de partida, distribua a economia mensal de forma proporcional ao "peso" de cada meta (considere uma combinação de valor e urgência).
      - **Cálculo do Novo Prazo:** Com base na nova alocação mensal para cada meta, recalcule o novo prazo em meses (\`newMonths\`) para cada parceiro atingir seu objetivo. \`newMonths = amount / newPortion\`.
      - **Sobras (unallocated):** Calcule qualquer valor da economia mensal que não foi alocado.

  3.  **Escrever um Resumo (summary):** Crie um parágrafo curto, positivo e encorajador. Destaque que é possível trabalhar em ambos os sonhos juntos. Ex: "Ótimas metas! Com um plano conjunto, vocês podem tanto fazer a viagem dos sonhos quanto adiantar a hipoteca. Encontrei um equilíbrio que permite progredir nos dois objetivos."

  4.  **Elaborar a Análise (analysis):** Explique sua linha de raciocínio de forma clara. Mostre os cálculos. Compare o cenário original (individual) com o cenário proposto (conjunto), destacando os benefícios (ex: "Isso adia a viagem em 3 meses, mas vocês economizarão R$Y em juros da casa nesse período!"). Seja transparente sobre os prós e os contras.

  5.  **Definir Passos de Ação (actionSteps):** Forneça 2 ou 3 passos práticos e imediatos. Ex: "1. Criem uma 'conta de metas' conjunta.", "2. Configurem uma transferência automática mensal de R$Z.", "3. Comemorem a primeira economia conjunta!".

  Analise os dados e retorne o resultado no formato JSON solicitado.`,
});


const mediateGoalsFlow = ai.defineFlow(
  {
    name: 'mediateGoalsFlow',
    inputSchema: MediateGoalsInputSchema,
    outputSchema: MediateGoalsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('A Lúmina não conseguiu processar a mediação de metas.');
    }
    return output;
  }
);
