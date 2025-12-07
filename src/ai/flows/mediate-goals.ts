
'use server';

import { ai } from '@/ai/genkit';
import { 
    MediateGoalsInputSchema, 
    MediateGoalsOutputSchema, 
    type MediateGoalsInput, 
    type MediateGoalsOutput 
} from '@/lib/types';

export const mediateGoals = ai.defineFlow(
  {
    name: 'mediateGoalsFlow',
    inputSchema: MediateGoalsInputSchema,
    outputSchema: MediateGoalsOutputSchema,
  },
  async (input) => {
    
    const prompt = `Você é a Lúmina, uma terapeuta e planejadora financeira especialista em casais. Sua missão é ajudar casais a alinhar suas metas financeiras, mesmo quando parecem conflitantes. Você deve ser empática, neutra e focada em soluções ganha-ganha.

  **Contexto:**
  Um casal tem metas individuais e uma situação financeira conjunta. Você precisa analisar todos os dados para propor um plano conjunto equilibrado.

  **Informações Recebidas:**
  - **Renda e Despesas:**
    - Parceiro A: Renda de ${input.partnerAIncome}, Despesas de ${input.partnerAExpenses}
    - Parceiro B: Renda de ${input.partnerBIncome}, Despesas de ${input.partnerBExpenses}
  - **Poupança Atual:** ${input.currentSavings}
  - **Capacidade de Economia Mensal do Casal:** ${input.sharedMonthlySavings}
  - **Meta do Parceiro A:** ${JSON.stringify(input.partnerAGoal)}
  - **Meta do Parceiro B:** ${JSON.stringify(input.partnerBGoal)}

  **Sua Tarefa:**
  1.  **Analisar a Viabilidade:** Verifique se a soma dos aportes mensais necessários para cada meta individual (\`amount\` / \`months\`) ultrapassa a capacidade de economia mensal do casal (\`sharedMonthlySavings\`). Se não ultrapassar, o plano é viável como está, e você deve alocar os valores e calcular o tempo para cada um, explicando que ambos são possíveis simultaneamente. Se ultrapassar, um compromisso será necessário. Considere a renda e despesas de cada um para comentar sobre a capacidade de contribuição.

  2.  **Criar um Plano Conjunto (jointPlan):**
      - **Alocação Proporcional:** Como ponto de partida, distribua a economia mensal de forma proporcional ao "peso" de cada meta (considere uma combinação de valor e urgência).
      - **Cálculo do Novo Prazo:** Com base na nova alocação mensal para cada meta, recalcule o novo prazo em meses (\`newMonths\`) para cada parceiro atingir seu objetivo. \`newMonths = amount / newPortion\`.
      - **Sobras (unallocated):** Calcule qualquer valor da economia mensal que não foi alocado.

  3.  **Escrever um Resumo (summary):** Crie um parágrafo curto, positivo e encorajador. Destaque que é possível trabalhar em ambos os sonhos juntos. Ex: "Ótimas metas! Com um plano conjunto, vocês podem tanto fazer a viagem dos sonhos quanto adiantar a hipoteca. Encontrei um equilíbrio que permite progredir nos dois objetivos."

  4.  **Elaborar a Análise (analysis):** Explique sua linha de raciocínio de forma clara. Mostre os cálculos. Compare o cenário original (individual) com o cenário proposto (conjunto), destacando os benefícios (ex: "Isso adia a viagem em 3 meses, mas vocês economizarão R$Y em juros da casa nesse período!"). Seja transparente sobre os prós e os contras.

  5.  **Definir Passos de Ação (actionSteps):** Forneça 2 ou 3 passos práticos e imediatos. Ex: "1. Criem uma 'conta de metas' conjunta.", "2. Configurem uma transferência automática mensal de R$Z.", "3. Comemorem a primeira economia conjunta!".

  Analise os dados e retorne o resultado no formato JSON solicitado.`;

    const result = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        prompt: prompt,
        config: {
          retries: 3,
        },
        output: {
            format: 'json',
            schema: MediateGoalsOutputSchema
        }
    });

    const output = result.output;
    if (!output) {
      throw new Error('A Lúmina não conseguiu processar a mediação de metas.');
    }
    return output;
  }
);
